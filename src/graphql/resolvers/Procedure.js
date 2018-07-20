/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import _ from 'lodash';

import procedureStates from '../../config/procedureStates';
import CONSTANTS from '../../config/constants';

import elasticsearch from '../../services/search';

export default {
  Query: {
    procedures: async (
      parent,
      {
        type, offset = 0, pageSize = 99, sort = 'lastUpdateDate', filter = {},
      },
      { ProcedureModel },
    ) => {
      let currentStates = [];

      const filterQuery = {};
      if (filter.type && filter.type.length > 0) {
        filterQuery.type = { $in: filter.type };
      }
      if (filter.subjectGroups && filter.subjectGroups.length > 0) {
        filterQuery.subjectGroups = { $in: filter.subjectGroups };
      }

      let sortQuery = {};
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
      if (type === 'PREPARATION') {
        switch (sort) {
          case 'activities':
            sortQuery = { activities: -1, lastUpdateDate: -1, title: 1 };
            break;
          case 'created':
            sortQuery = { submissionDate: -1, lastUpdateDate: -1, title: 1 };
            break;

          default:
            sortQuery = {
              lastUpdateDate: -1,
              title: 1,
            };
            break;
        }
        return ProcedureModel.find({
          currentStatus: { $in: currentStates },
          period,
          voteDate: { $not: { $type: 'date' } },
          ...filterQuery,
        })
          .sort(sortQuery)
          .limit(pageSize)
          .skip(offset);
      }
      if (type === 'HOT') {
        const oneWeekAgo = new Date();
        const hotProcedures = await ProcedureModel.find({
          period,
          activities: { $gt: 0 },
          $or: [
            { voteDate: { $gt: new Date(oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)) } },
            { voteDate: { $not: { $type: 'date' } } },
          ],
          ...filterQuery,
        })
          .sort({ activities: -1, lastUpdateDate: -1, title: 1 })
          .skip(offset)
          .limit(pageSize);

        return hotProcedures;
      }

      switch (sort) {
        case 'activities':
          sortQuery = { activities: -1, lastUpdateDate: -1, title: 1 };
          break;

        default:
          sortQuery = {
            nlt: 1,
            voteDate: -1,
            lastUpdateDate: -1,
            title: 1,
          };
          break;
      }

      const activeVotings = await ProcedureModel.aggregate([
        {
          $match: {
            $or: [
              {
                currentStatus: { $in: ['Beschlussempfehlung liegt vor'] },
                voteDate: { $not: { $type: 'date' } },
              },
              {
                currentStatus: { $in: ['Beschlussempfehlung liegt vor', 'Überwiesen'] },
                voteDate: { $gte: new Date() },
              },
            ],
            period,
            ...filterQuery,
          },
        },
        {
          $addFields: {
            nlt: { $ifNull: ['$voteDate', new Date('9000-01-01')] },
          },
        },
        { $sort: sortQuery },
        { $skip: offset },
        { $limit: pageSize },
      ]);

      let pastVotings = [];
      if (activeVotings.length < pageSize) {
        const activeVotingsCount = await ProcedureModel.find({
          $or: [
            {
              currentStatus: { $in: ['Beschlussempfehlung liegt vor'] },
              voteDate: { $not: { $type: 'date' } },
            },
            {
              currentStatus: { $in: ['Beschlussempfehlung liegt vor', 'Überwiesen'] },
              voteDate: { $gte: new Date() },
            },
          ],
          period,
          ...filterQuery,
        }).count();

        pastVotings = await ProcedureModel.find({
          $or: [
            { voteDate: { $lt: new Date() } },
            { currentStatus: { $in: procedureStates.COMPLETED } },
          ],
          period,
          ...filterQuery,
        })
          .sort(sortQuery)
          .skip(Math.max(offset - activeVotingsCount, 0))
          .limit(pageSize - activeVotings.length);
      }

      return [...activeVotings, ...pastVotings];
    },

    proceduresById: async (parent, { ids }, { ProcedureModel }) =>
      ProcedureModel.find({ _id: { $in: ids } }),

    procedure: async (parent, { id }, { user, ProcedureModel }) => {
      const procedure = await ProcedureModel.findOne({ procedureId: id });
      // eslint-disable-next-line
      const listType = procedureStates.VOTING.concat(procedureStates.COMPLETED).some(
        status => procedure.currentStatus === status)
        ? 'VOTING'
        : 'PREPARATION';

      return {
        ...procedure.toObject(),
        notify: !!(user && user.notificationSettings.procedures.indexOf(procedure._id) > -1),
      };
    },

    searchProceduresAutocomplete: async (parent, { term }, { ProcedureModel }) => {
      let autocomplete = [];

      // Search by procedureID or Document id
      const directProcedures = await ProcedureModel.find({
        $or: [
          { procedureId: term },
          {
            'importantDocuments.number': term,
          },
        ],
      });
      if (directProcedures.length > 0) {
        return {
          procedures: directProcedures,
          autocomplete,
        };
      }

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
      if (suggest.autocomplete[0]) {
        autocomplete = suggest.autocomplete[0].options.map(({ text }) => text);
      }
      return {
        procedures:
          _.sortBy(procedures, ({ procedureId }) => procedureIds.indexOf(procedureId)) || [],
        autocomplete,
      };
    },

    // DEPRECATED
    searchProcedures: async (parent, { term }, { ProcedureModel }) => {
      const { hits } = await elasticsearch.search({
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
        },
      });

      // prepare procedures
      const procedureIds = hits.hits.map(({ _source: { procedureId } }) => procedureId);
      return ProcedureModel.find({ procedureId: { $in: procedureIds } });
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
      const activityIndex = procedure.activities || 0;
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
    listType: (procedure) => {
      if (
        procedure.currentStatus === 'Beschlussempfehlung liegt vor' ||
        (procedure.currentStatus === 'Überwiesen' &&
          procedure.voteDate &&
          new Date(procedure.voteDate) >= new Date()) ||
        procedureStates.COMPLETED.some(s => s === procedure.currentStatus || procedure.voteDate)
      ) {
        return 'VOTING';
      }
      return 'PREPARATION';
    },
  },
};
