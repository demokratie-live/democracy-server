import { up as MigrationUp, down as MigrationDown } from 'mongodb-migrations';
import { typedModel } from 'ts-mongoose';
import ProcedureSchema from './3-schemas/Procedure';
import { convertPartyName } from '../importer/tools';

module.exports.id = 'convert-party-names';

const up: MigrationUp = async function(done) {
  // eslint-disable-line
  // Why do we have to catch here - makes no sense!
  try {
    const ProceduresModel = typedModel('Procedure', ProcedureSchema);
    // Find all procedures with partyVotes
    const Procedures = await ProceduresModel.find({ 'voteResults.partyVotes': { $exists: true } });
    const savePromises = Procedures.map(procedure => {
      // Convert all Partynames using unified converter
      procedure.voteResults.partyVotes = procedure.voteResults.partyVotes.map(partyVote => {
        // eslint-disable-line
        partyVote.party = convertPartyName(partyVote.party); // eslint-disable-line
        return partyVote;
      });
      // Save Procedure
      return procedure.save();
    });
    // Wait till every procedure.save is performed
    await Promise.all(savePromises);
    done();
  } catch (err) {
    done(err);
  }
};

const down: MigrationDown = async function(done) {
  // eslint-disable-line
  // Unification is not rolled back
  done(new Error('Not supported rollback!'));
};

export { up, down };
