/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Types } from 'mongoose';

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
    votes: (parent, { procedure }, { VoteModel, user }) =>
      VoteModel.aggregate([
        { $match: { procedure: Types.ObjectId(procedure) } },
        { $addFields: { voted: { $in: [user ? user._id : false, '$users'] } } },
        {
          $group: {
            _id: '$procedure',
            yes: { $sum: '$voteResults.yes' },
            no: { $sum: '$voteResults.no' },
            abstination: { $sum: '$voteResults.abstination' },
            voted: { $first: '$voted' },
          },
        },
        {
          $project: {
            _id: 1,
            voted: 1,
            voteResults: {
              yes: '$yes',
              no: '$no',
              abstination: '$abstination',
            },
          },
        },
      ]).then(result =>
        result[0] || { voted: false, voteResults: { yes: null, no: null, abstination: null } }),
  },

  Mutation: {
    vote: async (
      parent,
      { procedure: procedureId, selection },
      { VoteModel, ProcedureModel, user },
    ) => {
      if (!user) {
        throw new Error('No Auth!');
      }
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
        { $addFields: { voted: { $in: [user._id, '$users'] } } },
        {
          $group: {
            _id: '$procedure',
            yes: { $sum: '$voteResults.yes' },
            no: { $sum: '$voteResults.no' },
            abstination: { $sum: '$voteResults.abstination' },
            voted: { $first: '$voted' },
          },
        },
        {
          $project: {
            _id: 1,
            voted: 1,
            voteResults: {
              yes: '$yes',
              no: '$no',
              abstination: '$abstination',
            },
          },
        },
      ]).then(result =>
        result[0] || { voted: false, voteResults: { yes: null, no: null, abstination: null } });
    },
  },
};
