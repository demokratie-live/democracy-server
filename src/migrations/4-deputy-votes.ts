import mongoose from 'mongoose';
import { up as MigrationUp, down as MigrationDown } from 'mongodb-migrations';

import { typedModel } from 'ts-mongoose';
import DeputySchema from './4-schemas/Deputy';

module.exports.id = 'deputy-votes';

const up: MigrationUp = async function(done) {
  // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    // Remove Model from Mongoose if needed
    if (mongoose.connection.models.Deputy) {
      delete mongoose.connection.models.Deputy;
    }

    // We just add another field - no need for further transformations
    const Deputies = typedModel('Deputy', DeputySchema);
    await Deputies.ensureIndexes();

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
