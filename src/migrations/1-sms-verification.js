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
    if (this.db.s.children.length === 0) {
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
    while (await userCursor.hasNext()) { // eslint-disable-line no-await-in-loop
      const oldUser = await userCursor.next(); // eslint-disable-line no-await-in-loop
      // New Device
      const device = await DeviceModel.create({ // eslint-disable-line no-await-in-loop
        deviceHash: crypto.createHash('sha256').update(oldUser.deviceHash).digest('hex'),
        pushTokens: oldUser.pushTokens,
        notificationSettings: oldUser.notificationSettings,
      });
      await device.save(); // eslint-disable-line no-await-in-loop

      // New User
      const newUser = await UserModel.create({ device }); // eslint-disable-line no-await-in-loop
      await newUser.save(); // eslint-disable-line no-await-in-loop
    }

    // Transform oldVotes -> Votes
    const voteCursor = oldVotes.find();
    while (await voteCursor.hasNext()) { // eslint-disable-line no-await-in-loop
      const oldVote = await voteCursor.next(); // eslint-disable-line no-await-in-loop
      // Transform Voters
      const voters = await Promise.all(oldVote.users.map(async (id) => { // eslint-disable-line
        const oldVoter = await oldUsers.findOne({ _id: id }); // eslint-disable-line
        const device = await DeviceModel.findOne({ // eslint-disable-line no-await-in-loop
          deviceHash: crypto.createHash('sha256').update(oldVoter.deviceHash).digest('hex'),
        });
        return { kind: 'Device', voter: device._id };// eslint-disable-line no-underscore-dangle
      }));

      // New Vote
      const newVote = await VoteModel.create({ // eslint-disable-line no-await-in-loop
        procedure: oldVote.procedure,
        state: oldVote.state,
        voteResults: oldVote.voteResults,
        voters,
      });
      await newVote.save(); // eslint-disable-line no-await-in-loop
    }

    // Transform oldActivities -> Activities
    const activityCursor = oldActivities.find();
    while (await activityCursor.hasNext()) { // eslint-disable-line no-await-in-loop
      const oldActivity = await activityCursor.next(); // eslint-disable-line no-await-in-loop
      const oldActor = await oldUsers.findOne({ // eslint-disable-line no-await-in-loop
        _id: oldActivity.user,
      });
      const device = await DeviceModel.findOne({ // eslint-disable-line no-await-in-loop
        deviceHash: crypto.createHash('sha256').update(oldActor.deviceHash).digest('hex'),
      });
      // New Activity
      const newActivity = await ActivityModel.create({ // eslint-disable-line no-await-in-loop
        procedure: oldActivity.procedure,
        kind: 'Device',
        actor: device,
      });
      await newActivity.save(); // eslint-disable-line no-await-in-loop
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
