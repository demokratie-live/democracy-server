/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import _ from 'lodash';

import procedureStates from '../../config/procedureStates';
import CONSTANTS from '../../config/constants';

import elasticsearch from '../../services/search';

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
        return ProcedureModel.find({
          currentStatus: { $in: currentStates },
          period,
          voteDate: { $not: { $type: 'date' } },
        });
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
            $or: [
              {
                currentStatus: { $in: currentStates },
                voteDate: { $exists: false },
              },
              { voteDate: { $gte: new Date() } },
            ],
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
        voteDate: { $lt: new Date() },
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
        status => procedure.currentStatus === status || procedure.voteDate)
        ? 'VOTING'
        : 'PREPARATION';
      return {
        ...procedure.toObject(),
        listType,
        notify: !!(user && user.notificationSettings.procedures.indexOf(procedure._id) > -1),
      };
    },

    searchProcedures: async (parent, { term }, { ProcedureModel }) => {
      const { hits, suggest } = await elasticsearch.search({
        index: 'procedures',
        type: 'procedure',
        body: {
          query: {
            function_score: {
              query: {
                bool: {
                  must: [
                    {
                      term: { period: 19 },
                    },
                    {
                      query_string: {
                        query: "type:'Antrag' OR type:'Gesetzgebung'",
                      },
                    },
                    {
                      multi_match: {
                        query: `*${term}*`,
                        fields: ['title^3', 'tags^2.5', 'abstract^2'],
                        fuzziness: 'AUTO',
                        prefix_length: 3,
                      },
                    },
                  ],
                },
              },
            },
          },

          suggest: {
            autocomplete: {
              text: `${term}`,
              term: {
                field: 'title',
                suggest_mode: 'popular',
              },
            },
          },
        },
      });

      // prepare procedures
      const procedureIds = hits.hits.map(({ _source: { procedureId } }) => procedureId);
      const procedures = await ProcedureModel.find({ procedureId: { $in: procedureIds } });

      // prepare autocomplete
      let autocomplete = [];
      if (suggest.autocomplete[0]) {
        autocomplete = suggest.autocomplete[0].options.map(({ text }) => text);
      }
      return {
        procedures:
          _.sortBy(procedures, ({ procedureId }) => procedureIds.indexOf(procedureId)) || [],
        autocomplete,
      };
    },

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
