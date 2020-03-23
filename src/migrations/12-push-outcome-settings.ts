import mongoose from 'mongoose';
import { up as MigrationUp, down as MigrationDown } from 'mongodb-migrations';
import { typedModel } from 'ts-mongoose';
import DeviceSchema from './12-schemas/Device';

module.exports.id = 'push-outcome-settings';

const up: MigrationUp = async function(done) {
  // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    // Remove Model from Mongoose if needed - should not be the case
    if (mongoose.connection.models.Device) {
      delete mongoose.connection.models.Device;
    }

    const Devices = typedModel('Device', DeviceSchema);
    await Devices.ensureIndexes();

    // transform data
    const devs = this.db.collection('devices');
    const deviceCursor = devs.find();
    // eslint-disable-next-line no-await-in-loop
    while (await deviceCursor.hasNext()) {
      const device = await deviceCursor.next(); // eslint-disable-line no-await-in-loop

      // insert false value for outcomepush if not set (default is true)
      if (!device.notificationSettings.outcomePushs) {
        device.notificationSettings.outcomePushs = false;
        // update
        await devs.updateOne({ _id: device._id }, device); // eslint-disable-line no-await-in-loop, no-underscore-dangle
      }
      // dont update if not needed
    }

    done();
  } catch (err) {
    done(err);
  }
};

const down: MigrationDown = async function(done) {
  // eslint-disable-line
  // We should not revert this - this could cause dataloss
  done(new Error('Not supported rollback!'));
};

export { up, down };
