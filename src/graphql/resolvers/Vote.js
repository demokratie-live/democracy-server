/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Types } from 'mongoose';

import CONSTANTS from '../../config/constants';
import Activity from './Activity';
import procedureStates from '../../config/procedureStates';
import { isLoggedin, isVerified } from '../../express/auth/permissions';

export default {
  Query: {
    votes: isLoggedin.createResolver((parent, { procedure }, { VoteModel, device, phone }) =>
      VoteModel.aggregate([
        { $match: { procedure: Types.ObjectId(procedure) } },
        {
          $addFields: {
            voted: {
              kind: (CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device'),
              object: { $in: [CONSTANTS.SMS_VERIFICATION ? (phone ? phone._id : null) : device._id, '$voters'] }, // eslint-disable-line no-nested-ternary
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
        result[0] || { voted: false, voteResults: { yes: null, no: null, abstination: null } })),
  },

  Mutation: {
    vote: isVerified.createResolver(async (
      parent,
      { procedure: procedureId, selection },
      {
        VoteModel, ProcedureModel, ActivityModel, user, device, phone,
      },
    ) => {
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
      const hasVoted = vote.voters.some(({ kind, object }) =>
        kind === (CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device') && object.equals(CONSTANTS.SMS_VERIFICATION ? phone._id : device._id));
      if (!hasVoted) {
        const voteUpdate = {
          $push: {
            voters: {
              kind: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
              object: CONSTANTS.SMS_VERIFICATION ? phone._id : device._id,
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
      return VoteModel.aggregate([
        { $match: { procedure: procedure._id } },
        {
          $addFields: {
            voted: {
              kind: (CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device'),
              object: { $in: [CONSTANTS.SMS_VERIFICATION ? (phone ? phone._id : null) : device._id, '$voters'] }, // eslint-disable-line no-nested-ternary
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
        result[0] || { voted: false, voteResults: { yes: null, no: null, abstination: null } });
    }),
  },
};
