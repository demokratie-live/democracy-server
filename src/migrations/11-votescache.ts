import mongoose from 'mongoose';
import { up as MigrationUp, down as MigrationDown } from 'mongodb-migrations';

import { typedModel } from 'ts-mongoose';
import ProcedureSchema from './11-schemas/Procedure';
import CONFIG from '../config';

module.exports.id = 'votesCache';

const up: MigrationUp = async function(done) {
  // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    // Remove Model from Mongoose if needed
    if (mongoose.connection.models.Procedure) {
      delete mongoose.connection.models.Procedure;
    }

    // Load new models
    typedModel('Procedure', ProcedureSchema);

    // transform data
    const votes = this.db.collection('votes');
    const procedures = this.db.collection('procedures');
    const procedureCursor = procedures.find();
    // eslint-disable-next-line no-await-in-loop
    while (await procedureCursor.hasNext()) {
      const procedure = await procedureCursor.next(); // eslint-disable-line no-await-in-loop

      // find total amount of votes
      // eslint-disable-next-line no-await-in-loop
      const votesGlobal = await votes.aggregate([
        // Find Procedure
        {
          $match: {
            procedure: procedure._id, // eslint-disable-line no-underscore-dangle
            type: CONFIG.SMS_VERIFICATION ? 'Phone' : 'Device',
          },
        },
        // Sum both objects (state)
        {
          $group: {
            _id: '$procedure',
            yes: { $sum: '$votes.cache.yes' },
            no: { $sum: '$votes.cache.no' },
            abstination: { $sum: '$votes.cache.abstain' },
          },
        },
        {
          $addFields: {
            total: { $add: ['$yes', '$no', '$abstination'] },
          },
        },
      ]);

      // eslint-disable-next-line no-await-in-loop
      if (await votesGlobal.hasNext()) {
        const votesRes = await votesGlobal.next(); // eslint-disable-line no-await-in-loop
        // update votes cache
        procedure.votes = votesRes.total;
      } else {
        procedure.votes = 0;
      }

      // update
      await procedures.updateOne({ _id: procedure._id }, procedure); // eslint-disable-line no-await-in-loop, no-underscore-dangle
    }
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
