/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

const statesVoting = ['Beschlussempfehlung liegt vor'];
const statesCompleted = [
  'Zurückgezogen',
  'Erledigt durch Ablauf der Wahlperiode',
  'Einbringung abgelehnt',
  'Für erledigt erklärt',
  'Bundesrat hat zugestimmt',
  'Abgelehnt',
  'Verkündet',
  'Verabschiedet',
  'Zusammengeführt mit... (siehe Vorgangsablauf)',
];

export default {
  Query: {
    votes: (parent, { procedure }, { VoteModel }) =>
      VoteModel.findOne({ procedure }).then(result => result.voteResults),
  },

  Mutation: {
    vote: async (
      parent,
      { procedure: procedureId, selection },
      { VoteModel, ProcedureModel, user },
    ) => {
      // TODO check if procedure is votable
      const procedure = await ProcedureModel.findById(procedureId);
      let state;
      if (statesVoting.some(s => s === procedure.currentStatus)) {
        state = 'VOTING';
      } else if (statesCompleted.some(s => s === procedure.currentStatus)) {
        state = 'COMPLETED';
      }

      let vote = await VoteModel.findOne({ procedure });
      if (!vote) {
        vote = await VoteModel.create({ procedure, state });
      }
      const hasVoted = vote.users.some(uId => uId.equals(user._id));
      if (!hasVoted) {
        const voteUpdate = { $push: { users: user } };
        switch (selection) {
          case 'YES':
            voteUpdate.$inc = { 'voteResults.yes': 1 };
            break;
          case 'NO':
            voteUpdate.$inc = { 'voteResults.no': 1 };
            break;
          case 'ABSTINATION':
            voteUpdate.$inc = { 'voteResults.abstination': 1 };
            break;

          default:
            break;
        }
        await VoteModel.findByIdAndUpdate(vote._id, { ...voteUpdate, state });
      }
      return VoteModel.aggregate([
        { $match: { procedure: procedure._id } },
        {
          $group: {
            _id: '$procedure',
            yes: { $sum: '$voteResults.yes' },
            no: { $sum: '$voteResults.no' },
            abstination: { $sum: '$voteResults.abstination' },
          },
        },
      ]).then(result => result[0] || { yes: null, no: null, abstination: null });
    },
  },
};
