/* eslint no-await-in-loop: 0 */
import crypto from 'crypto';

import { typedModel } from 'ts-mongoose';
import UserSchema from './1-schemas/User';
import DeviceSchema from './1-schemas/Device';
import ActivitySchema from './1-schemas/Activity';
import VoteSchema from './1-schemas/Vote';

module.exports.id = 'sms-verification';

module.exports.up = async function(done) {
  // eslint-disable-line
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
    }).then(c => (Array.isArray(c) ? c.map(({ name }) => name) : []));

    const neededCollections = ['users', 'votes', 'activities'];
    const crashingCollections = ['old_users', 'old_votes', 'old_activities'];

    // if no target collection exists. Migration isn't neccecary
    if (!neededCollections.some(c => collections.includes(c))) {
      return done();
    }

    // Check if crashing collections does not exists
    if (crashingCollections.some(c => collections.includes(c))) {
      return done(Error('some Collections with target name for renaming exists'));
    }

    // Check if needed collections does exists
    if (!neededCollections.every(c => collections.includes(c))) {
      return done(Error('some source Collections missing'));
    }

    // rename collections
    await this.db.collection('users').rename('old_users');
    await this.db.collection('votes').rename('old_votes');
    await this.db.collection('activities').rename('old_activities');

    // find collections
    const oldUsers = this.db.collection('old_users');
    const oldVotes = this.db.collection('old_votes');
    const oldActivities = this.db.collection('old_activities');

    // load models
    const DeviceModel = typedModel('Device', DeviceSchema);
    const UserModel = typedModel('User', UserSchema);
    const ActivityModel = typedModel('Activity', ActivitySchema);
    const VoteModel = typedModel('Vote', VoteSchema);

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

module.exports.down = function(done) {
  // eslint-disable-line
  // We should not revert this - this could cause dataloss
  done(new Error('Not supported rollback!'));
};
