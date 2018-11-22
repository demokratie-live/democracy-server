/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Types } from 'mongoose';

import CONSTANTS from '../../config/constants';
import Activity from './Activity';
import { isLoggedin, isVerified } from '../../express/auth/permissions';
import procedureStates from '../../config/procedureStates';

const queryVotes = async (parent, { procedure, constituency }, { VoteModel, device, phone }) => {
  Log.graphql('Vote.query.votes');
  // Has user voted?
  const voted = await VoteModel.findOne({
    procedure: Types.ObjectId(procedure),
    type: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
    voters: {
      voter: CONSTANTS.SMS_VERIFICATION ? (phone ? phone._id : null) : device._id, // eslint-disable-line no-nested-ternary
    },
  });

  // Find sum of all votes for procedure
  // TODO: We could check here if user has voted - but since the results are available in the Browserversion
  // this is not nessecary?
  const votes = await VoteModel.aggregate([
    // Find Procedure, including type; results in up to two objects for state
    {
      $match: {
        procedure: Types.ObjectId(procedure),
        type: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
      },
    },
    // Filter correct constituency
    {
      $project: {
        procedure: true,
        votes: {
          cache: true,
          constituencies: {
            $filter: {
              input: '$votes.constituencies',
              as: 'constituency',
              cond: { $eq: ['$$constituency.constituency', constituency] },
            },
          },
        },
      },
    },
    // Unwind constituencies for sum, but preserve null
    {
      $unwind: {
        path: '$votes.constituencies',
        preserveNullAndEmptyArrays: true,
      },
    },
    // Sum both objects (state)
    {
      $group: {
        _id: '$procedure',
        yes: { $sum: '$votes.cache.yes' },
        no: { $sum: '$votes.cache.no' },
        abstain: { $sum: '$votes.cache.abstain' },
        constituencyYes: { $sum: '$votes.constituencies.yes' },
        constituencyNo: { $sum: '$votes.constituencies.no' },
        constituencyAbstain: { $sum: '$votes.constituencies.abstain' },
      },
    },
    // Add voted state from previous query
    { $addFields: { voted: !!voted } },
    // Build correct result
    {
      $project: {
        _id: true,
        voted: true,
        voteResults: {
          yes: '$yes',
          no: '$no',
          abstination: '$abstain',
          constituencies: [
            {
              constituency,
              yes: '$constituencyYes',
              no: '$constituencyNo',
              abstination: '$constituencyAbstain',
            },
          ],
        },
      },
    },
  ]);
  if (votes.length > 0) {
    return votes[0];
  }
  return {
    voted: false,
    voteResults: { yes: null, no: null, abstination: null },
  };
};

export default {
  Query: {
    votes: isLoggedin.createResolver(queryVotes),
    communityVotes: async (parent, { procedure: procedureId }, { VoteModel, ProcedureModel }) => {
      Log.graphql('Vote.query.communityVotes');
      const procedure = await ProcedureModel.findOne({ procedureId }, { _id: 1 });

      // Find sum of all votes for procedure
      const votes = await VoteModel.aggregate([
        // Find Procedure
        {
          $match: {
            procedure: procedure._id,
            type: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
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
        // Remove _id from result
        {
          $project: {
            _id: false,
          },
        },
      ]);
      if (votes.length > 0) {
        return votes[0];
      }
      return null;
    },
    voteStatistic: async (parent, args, { user, ProcedureModel, VoteModel, phone, device }) => {
      Log.graphql('Vote.query.voteStatistic', user.isVerified());
      if (!user.isVerified()) {
        return null;
      }

      const period = { $gte: CONSTANTS.MIN_PERIOD };

      // This query should reference the ProcedureModel Method isCompleted
      // TODO is that possible?
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
          type: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
          voters: {
            $elemMatch: {
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
        { procedure: procedureId, selection, constituency },
        { VoteModel, ProcedureModel, ActivityModel, user, device, phone },
      ) => {
        Log.graphql('Vote.mutation.vote');
        // Find procedure
        const procedure = await ProcedureModel.findById(procedureId);
        // Fail if not existant or not votable
        if (!procedure || !procedure.isVotable()) {
          throw new Error('Not votable');
        }
        // User Has Voted?
        const hasVoted = await VoteModel.findOne({
          procedure,
          type: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
          voters: {
            $elemMatch: {
              voter: CONSTANTS.SMS_VERIFICATION ? phone._id : device._id,
            },
          },
        });
        // Fail if user has already voted
        if (hasVoted) {
          Log.warn('User tried to vote twice - vote was not counted!');
          throw new Error('You have already voted');
        }
        // Decide Bucket to put user-vote in
        let state = 'COMPLETED';
        if (procedure.isVoting()) {
          state = 'VOTING';
        }
        // Find & Create Vote Model if needed
        let vote = await VoteModel.findOne({
          procedure,
          type: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
          state,
        });
        if (!vote) {
          vote = await VoteModel.create({
            procedure,
            type: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
            state,
          });
        }
        // Add constituency object if needed
        if (constituency) {
          VoteModel.findByIdAndUpdate(vote._id, {
            $addToSet: {
              'votes.constituencies': {
                constituency,
              },
            },
          });
        }

        // Cast Vote
        const voteUpdate = {
          $push: {
            voters: {
              voter: CONSTANTS.SMS_VERIFICATION ? phone._id : device._id,
            },
          },
        };
        // Cache needs to be controlled manually
        switch (selection) {
          case 'YES':
            if (constituency) {
              voteUpdate.$inc = { 'votes.constituencies.$.yes': 1, 'votes.cache.yes': 1 };
            } else {
              voteUpdate.$inc = { 'votes.general.yes': 1, 'votes.cache.yes': 1 };
            }
            break;
          case 'NO':
            if (constituency) {
              voteUpdate.$inc = { 'votes.constituencies.$.no': 1, 'votes.cache.no': 1 };
            } else {
              voteUpdate.$inc = { 'votes.general.no': 1, 'votes.cache.no': 1 };
            }
            break;
          case 'ABSTINATION':
            if (constituency) {
              voteUpdate.$inc = { 'votes.constituencies.$.abstain': 1, 'votes.cache.abstain': 1 };
            } else {
              voteUpdate.$inc = { 'votes.general.abstain': 1, 'votes.cache.abstain': 1 };
            }
            break;

          default:
            throw new Error(`Invlaid Vote Selection: ${selection}`);
        }
        await VoteModel.update(
          { _id: vote._id, 'votes.constituencies.constituency': constituency },
          { ...voteUpdate },
        );
        // Increate Activity
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
        // Return new User Vote Results
        return queryVotes(parent, { procedureId, constituency }, { VoteModel, device, phone });
      },
    ),
  },
};
