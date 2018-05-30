/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

import procedureStates from '../../config/procedureStates';
import CONSTANTS from '../../config/constants';

export default {
  Query: {
    procedures: async (parent, { type, offset = 0, pageSize = 99 }, { ProcedureModel }) => {
      let currentStates = [];
      switch (type) {
        case 'PREPARATION':
          currentStates = procedureStates.PREPARATION;
          break;
        case 'VOTING':
          currentStates = procedureStates.VOTING.concat(procedureStates.COMPLETED);
          break;
        case 'HOT':
          currentStates = [];
          break;

        default:
          break;
      }

      const period = { $gte: CONSTANTS.MIN_PERIOD };
      let sort = { voteDate: -1, lastUpdateDate: -1 };
      if (type === 'PREPARATION') {
        sort = { lastUpdateDate: -1 };
        return ProcedureModel.find({ currentStatus: { $in: currentStates }, period })
          .sort(sort)
          .skip(offset)
          .limit(pageSize);
      }
      if (type === 'HOT') {
        const oneWeekAgo = new Date();
        sort = {};
        const schemaProps = Object.keys(ProcedureModel.schema.obj).reduce(
          (obj, prop) => ({ ...obj, [prop]: { $first: `$${prop}` } }),
          {},
        );
        const hotProcedures = await ProcedureModel.aggregate([
          {
            $match: {
              period,
              $or: [
                { voteDate: { $gt: oneWeekAgo.setDate(oneWeekAgo.getDate() - 7) } },
                { voteDate: null },
              ],
            },
          },
          {
            $lookup: {
              from: 'activities',
              localField: '_id',
              foreignField: 'procedure',
              as: 'activityIndex',
            },
          },
          { $unwind: '$activityIndex' },
          {
            $group: {
              _id: '$_id',
              ...schemaProps,
              activities: { $sum: 1 },
            },
          },
          { $sort: { activities: -1 } },
          {
            $addFields: {
              listType: {
                $cond: {
                  if: {
                    $in: [
                      '$currentStatus',
                      procedureStates.VOTING.concat(procedureStates.COMPLETED),
                    ],
                  },
                  then: 'VOTING',
                  else: 'PREPARATION',
                },
              },
            },
          },

          { $skip: offset },
          { $limit: pageSize },
        ]);

        return hotProcedures;
      }

      const activeVotings = await ProcedureModel.aggregate([
        {
          $match: {
            $or: [{ voteDate: { $gte: new Date() } }, { voteDate: { $exists: false } }],
            currentStatus: { $in: currentStates },
            period,
          },
        },
        {
          $addFields: {
            nlt: { $ifNull: ['$voteDate', new Date('9000-01-01')] },
          },
        },
        { $sort: { nlt: 1, lastUpdateDate: -1 } },
        { $skip: offset },
        { $limit: pageSize },
      ]);

      return ProcedureModel.find({
        voteDate: { $lt: new Date().toISOString() },
        currentStatus: { $in: currentStates },
        period,
      })
        .sort(sort)
        .skip(offset - activeVotings.length > 0 ? offset - activeVotings.length : 0)
        .limit(pageSize - activeVotings.length)
        .then(finishedVotings => [...activeVotings, ...finishedVotings]);
    },

    procedure: async (parent, { id }, { user, ProcedureModel }) => {
      const procedure = await ProcedureModel.findOne({ procedureId: id });
      // eslint-disable-next-line
      const listType = procedureStates.VOTING.concat(procedureStates.COMPLETED).some(
        status => procedure.currentStatus === status)
        ? 'VOTING'
        : 'PREPARATION';
      return {
        ...procedure.toObject(),
        listType,
        notify: !!(user && user.notificationSettings.procedures.indexOf(procedure._id) > -1),
      };
    },

    searchProcedures: (parent, { term }, { ProcedureModel }) =>
      ProcedureModel.find(
        {
          $or: [
            { procedureId: { $regex: term, $options: 'i' } },
            { title: { $regex: term, $options: 'i' } },
            { abstract: { $regex: term, $options: 'i' } },
            { tags: { $regex: term, $options: 'i' } },
            { subjectGroups: { $regex: term, $options: 'i' } },
          ],
          period: { $gte: CONSTANTS.MIN_PERIOD },
        },
        { score: { $meta: 'textScore' } },
      ).sort({ score: { $meta: 'textScore' } }),

    notifiedProcedures: async (parent, args, { user, ProcedureModel }) => {
      if (!user) {
        throw new Error('no Auth');
      }
      const procedures = await ProcedureModel.find({
        _id: { $in: user.notificationSettings.procedures },
      });

      return procedures.map(procedure => ({
        ...procedure.toObject(),
        notify: true,
      }));
    },
  },

  Procedure: {
    activityIndex: async (procedure, args, { ActivityModel, user }) => {
      const activityIndex = await ActivityModel.find({ procedure }).count();
      const active = await ActivityModel.findOne({
        user,
        procedure,
      });
      return {
        activityIndex,
        active: !!active,
      };
    },
    voted: async (procedure, args, { VoteModel, user }) => {
      const voted = await VoteModel.findOne({ procedure, users: user });
      return !!voted;
    },
    votedGovernment: procedure =>
      procedure.voteResults &&
      (procedure.voteResults.yes || procedure.voteResults.abstination || procedure.voteResults.no),
    // TODO: remove(+schema) - this is a duplicate in oder to maintain backwards compatibility
    // required for client <= 0.7.5
    votedGoverment: procedure =>
      procedure.voteResults &&
      (procedure.voteResults.yes || procedure.voteResults.abstination || procedure.voteResults.no),
    completed: procedure => procedureStates.COMPLETED.includes(procedure.currentStatus),
  },
};
