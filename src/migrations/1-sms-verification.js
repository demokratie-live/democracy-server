/* eslint no-await-in-loop: 0 */
import crypto from 'crypto';

import UserModel from './../models/User';
import DeviceModel from './../models/Device';
import ActivityModel from './../models/Activity';
import VoteModel from './../models/Vote';

module.exports.id = 'sms-verification';

module.exports.up = async function (done) { // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    // Do we have a fresh install? - Mark as done
    const collections = await new Promise((resolve, reject) => {
      this.db.listCollections().toArray((err, names) => {
        if (err) {
          reject(err);
        } else {
          resolve(names);
        }
      });
    });
    // _migrations table is created therefore there can be one collection
    if (collections.length <= 1) {
      done();
      return;
    }

    // rename collections
    await this.db.collection('users').rename('old_users');
    await this.db.collection('votes').rename('old_votes');
    await this.db.collection('activities').rename('old_activities');

    // find collections
    const oldUsers = this.db.collection('old_users');
    const oldVotes = this.db.collection('old_votes');
    const oldActivities = this.db.collection('old_activities');

    // Transform oldUsers -> Users + Devices
    const userCursor = oldUsers.find();
    while (await userCursor.hasNext()) {
      const oldUser = await userCursor.next();
      // New Device
      const device = await DeviceModel.create({
        deviceHash: crypto
          .createHash('sha256')
          .update(oldUser.deviceHash)
          .digest('hex'),
        pushTokens: oldUser.pushTokens,
        notificationSettings: oldUser.notificationSettings,
      });
      await device.save();

      // New User
      const newUser = await UserModel.create({ device });
      await newUser.save();
    }

    // Transform oldVotes -> Votes
    const voteCursor = oldVotes.find();
    while (await voteCursor.hasNext()) {
      const oldVote = await voteCursor.next();
      // Transform Voters
      const voters = await Promise.all(
        oldVote.users.map(async id => {
          const oldVoter = await oldUsers.findOne({ _id: id }); // eslint-disable-line no-underscore-dangle
          const device = await DeviceModel.findOne({
            deviceHash: crypto
              .createHash('sha256')
              .update(oldVoter.deviceHash)
              .digest('hex'),
          });
          return { kind: 'Device', voter: device._id }; // eslint-disable-line no-underscore-dangle
        }),
      );

      // New Vote
      const newVote = await VoteModel.create({
        procedure: oldVote.procedure,
        state: oldVote.state,
        voteResults: {
          device: oldVote.voteResults,
          phone: { yes: 0, no: 0, abstination: 0 },
        },
        voters,
      });
      await newVote.save();
    }

    // Transform oldActivities -> Activities
    const activityCursor = oldActivities.find();
    while (await activityCursor.hasNext()) {
      const oldActivity = await activityCursor.next();
      const oldActor = await oldUsers.findOne({
        _id: oldActivity.user,
      });
      const device = await DeviceModel.findOne({
        deviceHash: crypto
          .createHash('sha256')
          .update(oldActor.deviceHash)
          .digest('hex'),
      });
      // New Activity
      const newActivity = await ActivityModel.create({
        procedure: oldActivity.procedure,
        kind: 'Device',
        actor: device,
      });
      await newActivity.save();
    }

    done();
  } catch (err) {
    done(err);
  }
};

module.exports.down = function (done) { // eslint-disable-line
  // We should not revert this - this could cause dataloss
  done(new Error('Not supported rollback!'));
};
