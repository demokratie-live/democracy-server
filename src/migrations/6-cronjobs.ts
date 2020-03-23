import mongoose from 'mongoose';

import { up as MigrationUp, down as MigrationDown } from 'mongodb-migrations';

import { typedModel } from 'ts-mongoose';
import CronJobSchema from './6-schemas/CronJob';

module.exports.id = 'cronjobs';

const up: MigrationUp = async function(done) {
  // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    // Remove Model from Mongoose if needed - should not be the case
    if (mongoose.connection.models.CronJob) {
      delete mongoose.connection.models.CronJob;
    }

    const CronJobs = typedModel('CronJob', CronJobSchema);
    await CronJobs.ensureIndexes();

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
