import mongoose from 'mongoose';
import DeviceSchema from './9-schemas/Device';

module.exports.id = 'new-push-settings';

module.exports.up = async function (done) { // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    // Remove Model from Mongoose if needed - should not be the case
    if (mongoose.connection.models.Device) {
      delete mongoose.connection.models.Device;
    }

    const Devices = mongoose.model('Device', DeviceSchema);
    await Devices.ensureIndexes();

    // transform data
    const devs = this.db.collection('devices');
    const deviceCursor = devs.find();
    // eslint-disable-next-line no-await-in-loop
    while (await deviceCursor.hasNext()) {
      const device = await deviceCursor.next(); // eslint-disable-line no-await-in-loop

      // tranform push settings
      device.notificationSettings.conferenceWeekPushs = device.notificationSettings.enabled;
      device.notificationSettings.voteConferenceWeekPushs = device.notificationSettings.newVote;
      device.notificationSettings.voteTOP100Pushs = device.notificationSettings.newPreperation;

      // update
      await devs.updateOne({ _id: device._id }, device); // eslint-disable-line no-await-in-loop, no-underscore-dangle
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
