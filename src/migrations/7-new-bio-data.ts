import mongoose from 'mongoose';

import { typedModel } from 'ts-mongoose';
import ProcedureSchema from './7-schemas/Procedure';

module.exports.id = 'new-bio-data';

module.exports.up = async function(done) {
  // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    // Remove Model from Mongoose if needed - should not be the case
    if (mongoose.connection.models.Procedure) {
      delete mongoose.connection.models.Procedure;
    }

    const Procedures = typedModel('Procedure', ProcedureSchema);
    await Procedures.ensureIndexes();

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
