import mongoose from 'mongoose';
import { up as MigrationUp, down as MigrationDown } from 'mongodb-migrations';

import { typedModel } from 'ts-mongoose';
import PushNotificationSchema from './8-schemas/PushNotification';

module.exports.id = 'new-push-notifications';

const up: MigrationUp = async function(done) {
  // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    // Do we have a fresh install? - Mark as done
    const collections = Object.keys(this.db.collections);

    const neededCollections = ['pushnotifications'];
    const crashingCollections = ['old_pushnotifications'];

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
    await this.db.collection('pushnotifications').rename('old_pushnotifications');

    // Remove Model from Mongoose if needed - should not be the case
    if (mongoose.connection.models.PushNotification) {
      delete mongoose.connection.models.PushNotification;
    }

    const PushNotifications = typedModel('PushNotification', PushNotificationSchema);
    await PushNotifications.ensureIndexes();

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
