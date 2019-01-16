/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Types } from 'mongoose';

import CONSTANTS from '../../config/constants';
import Activity from './Activity';
import procedureStates from '../../config/procedureStates';
import { isLoggedin, isVerified } from '../../express/auth/permissions';

const queryVotes = async (parent, { procedure }, { VoteModel, device, phone }) => {
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
    {
      $project: {
        _id: 1,
        voteResults: CONSTANTS.SMS_VERIFICATION ? '$voteResults.phone' : '$voteResults.device',
        voted: 1,
      },
    },
  ]);

  if (voted.length > 0) {
    return voted[0];
  }

  // To hide Vote results here needs to be another query
  // checking the procedure if the government has voted already
  const unvoted = await VoteModel.aggregate([
    { $match: { procedure: Types.ObjectId(procedure) } },
    { $addFields: { voted: false } },
    {
      $project: {
        _id: 1,
        voteResults: CONSTANTS.SMS_VERIFICATION ? '$voteResults.phone' : '$voteResults.device',
        voted: 1,
      },
    },
  ]);

  if (unvoted.length > 0) {
    return unvoted[0];
  }
  return { voted: false, voteResults: { yes: null, no: null, abstination: null } };
};

export default {
  Query: {
    votes: isLoggedin.createResolver(queryVotes),
    communityVotes: async (parent, { procedure: procedureId }, { VoteModel, ProcedureModel }) => {
      Log.graphql('Vote.query.communityVotes');
      const procedure = await ProcedureModel.findOne({ procedureId }, { _id: 1 });

      const voteProcedure = await VoteModel.findOne(
        { procedure: procedure._id },
        { voteResults: 1 },
      );
      if (voteProcedure) {
        return { ...voteProcedure.voteResults[CONSTANTS.SMS_VERIFICATION ? 'phone' : 'device'] };
      }
      return null;
    },
    voteStatistic: async (parent, args, { user, ProcedureModel, VoteModel, phone, device }) => {
      Log.graphql('Vote.query.voteStatistic', user.isVerified());
      if (!user.isVerified()) {
        return null;
      }

      const period = { $gte: CONSTANTS.MIN_PERIOD };

      const proceduresCount = ProcedureModel.find({
        period,
        $or: [
          { voteDate: { $type: 'date' } },
          { currentStatus: { $in: procedureStates.COMPLETED } },
          {
            currentStatus: { $in: ['Beschlussempfehlung liegt vor'] },
            voteDate: { $not: { $type: 'date' } },
          },
          {
            currentStatus: { $in: ['Beschlussempfehlung liegt vor', 'Überwiesen'] },
            voteDate: { $gte: new Date() },
          },
        ],
      }).count();

      const votedProcedures = await VoteModel.find(
        {
          voters: {
            $elemMatch: {
              kind: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
              voter: CONSTANTS.SMS_VERIFICATION ? phone._id : device._id,
            },
          },
        },
        { procedure: 1 },
      ).count();

      return {
        proceduresCount,
        votedProcedures,
      };
    },
  },

  Mutation: {
    vote: isVerified.createResolver(
      async (
        parent,
        { procedure: procedureId, selection },
        { VoteModel, ProcedureModel, ActivityModel, user, device, phone },
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
        const hasVoted = vote.voters.some(
          ({ kind, voter }) =>
            kind === (CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device') &&
            voter.equals(CONSTANTS.SMS_VERIFICATION ? phone._id : device._id),
        );
        if (hasVoted) {
          Log.warn('User tried to vote twice - vote was not counted!');
          throw new Error('You have already voted');
        }
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
            voteUpdate.$inc = CONSTANTS.SMS_VERIFICATION
              ? { 'voteResults.phone.yes': 1 }
              : { 'voteResults.device.yes': 1 };
            break;
          case 'NO':
            voteUpdate.$inc = CONSTANTS.SMS_VERIFICATION
              ? { 'voteResults.phone.no': 1 }
              : { 'voteResults.device.no': 1 };
            break;
          case 'ABSTINATION':
            voteUpdate.$inc = CONSTANTS.SMS_VERIFICATION
              ? { 'voteResults.phone.abstination': 1 }
              : { 'voteResults.device.abstination': 1 };
            break;

          default:
            break;
        }
        await VoteModel.findByIdAndUpdate(vote._id, { ...voteUpdate, state });

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
        return queryVotes(parent, { procedureId }, { VoteModel, device, phone });
      },
    ),
  },
  VoteResult: {
    governmentDecision: ({ yes, no }) => (yes > no ? 'YES' : 'NO'),
  },
};
