import mongoose from 'mongoose';
import { up as MigrationUp, down as MigrationDown } from 'mongodb-migrations';

import { typedModel } from 'ts-mongoose';
import CronJobSchema from './10-schemas/CronJob';

module.exports.id = 'cronjobs2';

const up: MigrationUp = async function(done) {
  // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    // rename collection
    await this.db.collection('cronjobs').rename('old_cronjobs');

    // Remove Model from Mongoose if needed
    if (mongoose.connection.models.CronJob) {
      delete mongoose.connection.models.CronJob;
    }

    // Load new models
    typedModel('CronJob', CronJobSchema);
    done();
  } catch (err) {
    done(err);
  }
};

const down: MigrationDown = async function(done) {
  // eslint-disable-line
  // We should not revert this - since this will result in dataloss
  done(new Error('Not supported rollback!'));
};

export { up, down };
