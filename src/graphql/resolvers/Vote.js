/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Types } from 'mongoose';
import CONSTANTS from '../../config/constants';
import procedureStates from '../../config/procedureStates';
import { isLoggedin, isVerified } from '../../express/auth/permissions';
import Activity from './Activity';

const queryVotes = async (parent, { procedure, constituencies }, { VoteModel, device, phone }) => {
  Log.graphql('Vote.query.votes');
  // Has user voted?
  const voted = await VoteModel.findOne({
    procedure: Types.ObjectId(procedure),
    type: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
    voters: {
      voter: CONSTANTS.SMS_VERIFICATION ? (phone ? phone._id : null) : device._id, // eslint-disable-line no-nested-ternary
    },
  });

  // Find global result(cache), not including constituencies
  const votesGlobal = await VoteModel.aggregate([
    // Find Procedure, including type; results in up to two objects for state
    {
      $match: {
        procedure: Types.ObjectId(procedure),
        type: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
      },
    },
    // Sum both objects (state)
    {
      $group: {
        _id: '$procedure',
        yes: { $sum: '$votes.cache.yes' },
        no: { $sum: '$votes.cache.no' },
        abstain: { $sum: '$votes.cache.abstain' },
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
        },
      },
    },
  ]);

  // Find constituency results if constituencies are given
  const votesConstituencies =
    (constituencies && constituencies.length > 0) || constituencies === undefined
      ? await VoteModel.aggregate([
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
              votes: {
                constituencies: {
                  $filter: {
                    input: '$votes.constituencies',
                    as: 'constituency',
                    cond: !constituencies
                      ? true // Return all Constituencies if constituencies param is not given
                      : { $in: ['$$constituency.constituency', constituencies] }, // Filter Constituencies if an array is given
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
              _id: '$votes.constituencies.constituency',
              yes: { $sum: '$votes.constituencies.yes' },
              no: { $sum: '$votes.constituencies.no' },
              abstain: { $sum: '$votes.constituencies.abstain' },
            },
          },
          // Build correct result
          {
            $project: {
              _id: false,
              constituency: '$_id',
              yes: '$yes',
              no: '$no',
              abstination: '$abstain',
            },
          },
        ])
          // TODO Change query to make the filter obsolet (preserveNullAndEmptyArrays)
          // Remove elements with property constituency: null (of no votes on it)
          .then(data => data.filter(({ constituency }) => constituency))
      : [];

  if (votesGlobal.length > 0) {
    votesGlobal[0].voteResults.constituencies = votesConstituencies;
    return votesGlobal[0];
  }
  return {
    voted: false,
    voteResults: { yes: null, no: null, abstination: null, constituencies: [] },
  };
};

export default {
  Query: {
    // Used by App
    votes: isLoggedin.createResolver(queryVotes),
    // Used by Browserverion -> TODO Remove
    communityVotes: async (
      parent,
      { procedure: procedureId, constituencies },
      { VoteModel, ProcedureModel },
    ) => {
      Log.graphql('Vote.query.communityVotes');
      const procedure = await ProcedureModel.findOne({ procedureId }, { _id: 1 });
      if (!procedure) {
        throw new Error(`Procedure could not be found. ID: ${procedureId}`);
      }

      // Find global result(cache), not including constituencies
      const votesGlobal = await VoteModel.aggregate([
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

      // Find constituency results if constituencies are given
      const votesConstituencies =
        (constituencies && constituencies.length > 0) || constituencies === undefined
          ? await VoteModel.aggregate([
              // Find Procedure, including type; results in up to two objects for state
              {
                $match: {
                  procedure: procedure._id,
                  type: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
                },
              },
              // Filter correct constituency
              {
                $project: {
                  votes: {
                    constituencies: {
                      $filter: {
                        input: '$votes.constituencies',
                        as: 'constituency',
                        cond: !constituencies
                          ? true // Return all Constituencies if constituencies param is not given
                          : { $in: ['$$constituency.constituency', constituencies] }, // Filter Constituencies if an array is given
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
                  _id: '$votes.constituencies.constituency',
                  yes: { $sum: '$votes.constituencies.yes' },
                  no: { $sum: '$votes.constituencies.no' },
                  abstain: { $sum: '$votes.constituencies.abstain' },
                },
              },
              // Build correct result
              {
                $project: {
                  _id: false,
                  constituency: '$_id',
                  yes: '$yes',
                  no: '$no',
                  abstination: '$abstain',
                },
              },
            ])
              // TODO Change query to make the filter obsolet (preserveNullAndEmptyArrays)
              // Remove elements with property constituency: null (of no votes on it)
              .then(data => data.filter(({ constituency }) => constituency))
          : [];

      if (votesGlobal.length > 0) {
        votesGlobal[0].constituencies = votesConstituencies;
        return votesGlobal[0];
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
        // Add constituency bucket object if needed
        if (constituency) {
          await VoteModel.findByIdAndUpdate(vote._id, {
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

        // Write Vote
        await VoteModel.updateOne(
          {
            _id: vote._id,
            // Add the constituency bucket selector conditionally
            ...(constituency && { 'votes.constituencies.constituency': constituency }),
          },
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
