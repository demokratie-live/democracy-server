/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Types } from 'mongoose';

import CONSTANTS from '../../config/constants';
import Activity from './Activity';
import procedureStates from '../../config/procedureStates';
import { isLoggedin, isVerified } from '../../express/auth/permissions';

export default {
  Query: {
    votes: isLoggedin.createResolver(async (parent, { procedure }, { VoteModel, device, phone }) => {
      Log.graphql('Vote.query.votes');
      const voted = await VoteModel.aggregate([
        { $match: { procedure: Types.ObjectId(procedure) } },
        { $unwind: '$voters' },
        {
          $match: {
            'voters.kind': CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
            'voters.voter': CONSTANTS.SMS_VERIFICATION ? (phone ? phone._id : null) : device._id, // eslint-disable-line no-nested-ternary
          },
        },
        { $addFields: { voted: true } },
        { $project: { _id: 1, voteResults: 1, voted: 1 } },
      ]);

      if (voted) {
        return voted;
      }

      const unvoted = await VoteModel.aggregate([
        { $match: { procedure: Types.ObjectId(procedure) } },
        { $addFields: { voted: false } },
        { $project: { _id: 1, voteResults: 1, voted: 1 } },
      ]);

      if (unvoted) {
        return unvoted;
      }

      return { voted: false, voteResults: { yes: null, no: null, abstination: null } };
    }),
  },

  Mutation: {
    vote: isVerified.createResolver(async (
      parent,
      { procedure: procedureId, selection },
      {
        VoteModel, ProcedureModel, ActivityModel, user, device, phone,
      },
    ) => {
      Log.graphql('Vote.mutation.vote');
      // TODO check if procedure is votable
      const procedure = await ProcedureModel.findById(procedureId);
      if (
        !(
          procedure.currentStatus === 'Beschlussempfehlung liegt vor' ||
            (procedure.currentStatus === 'Überwiesen' &&
              procedure.voteDate &&
              new Date(procedure.voteDate) >= new Date()) ||
            procedureStates.COMPLETED.some(s => s === procedure.currentStatus || procedure.voteDate)
        )
      ) {
        throw new Error('Not votable');
      }
      let state;
      if (
        procedure.currentStatus === 'Beschlussempfehlung liegt vor' ||
          (procedure.currentStatus === 'Überwiesen' &&
            procedure.voteDate &&
            new Date(procedure.voteDate) >= new Date())
      ) {
        state = 'VOTING';
      } else if (
        procedureStates.COMPLETED.some(s => s === procedure.currentStatus || procedure.voteDate)
      ) {
        state = 'COMPLETED';
      }

      let vote = await VoteModel.findOne({ procedure });
      if (!vote) {
        vote = await VoteModel.create({ procedure, state });
      }
      const hasVoted = vote.voters.some(({ kind, voter }) =>
        kind === (CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device') &&
            voter === (CONSTANTS.SMS_VERIFICATION ? phone._id : device._id));
      if (!hasVoted) {
        const voteUpdate = {
          $push: {
            voters: {
              kind: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
              voter: CONSTANTS.SMS_VERIFICATION ? phone._id : device._id,
            },
          },
        };
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
      await Activity.Mutation.increaseActivity(
        parent,
        { procedureId },
        {
          ProcedureModel,
          ActivityModel,
          user,
          phone,
          device,
        },
      );
      return this.Query.votes(parent, { procedureId }, { VoteModel, device, phone });
      /* return VoteModel.aggregate([
        { $match: { procedure: procedure._id } },
        {
          $addFields: {
            voted: {
              kind: (CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device'),
              voter: { $in: [CONSTANTS.SMS_VERIFICATION ? (phone ? phone._id : null) : device._id, '$voters'] }, // eslint-disable-line no-nested-ternary
            },
          },
        },
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
        result[0] || { voted: false, voteResults: { yes: null, no: null, abstination: null } }); */
    }),
  },
};
