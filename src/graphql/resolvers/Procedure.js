/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import _ from 'lodash';

import procedureStates from '../../config/procedureStates';
import CONSTANTS from '../../config/constants';

import elasticsearch from '../../services/search';

import { isLoggedin } from '../../express/auth/permissions';

export default {
  Query: {
    procedures: async (
      parent,
      { type, offset = 0, pageSize = 99, sort = 'lastUpdateDate', filter = {} },
      { ProcedureModel },
    ) => {
      Log.graphql('Procedure.query.procedures');
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

    proceduresById: async (parent, { ids }, { ProcedureModel }) => {
      Log.graphql('Procedure.query.proceduresById');
      return ProcedureModel.find({ _id: { $in: ids } });
    },

    procedure: async (parent, { id }, { user, device, ProcedureModel }) => {
      Log.graphql('Procedure.query.procedure');
      const procedure = await ProcedureModel.findOne({ procedureId: id });
      // TODO fail here of procedure is null
      // eslint-disable-next-line
      const listType = procedureStates.VOTING.concat(procedureStates.COMPLETED).some(
        status => procedure.currentStatus === status,
      )
        ? 'VOTING'
        : 'PREPARATION';

      return {
        ...procedure.toObject(),
        notify: !!(device && device.notificationSettings.procedures.indexOf(procedure._id) > -1),
        verified: user ? user.isVerified() : false,
      };
    },

    searchProceduresAutocomplete: async (parent, { term }, { ProcedureModel }) => {
      Log.graphql('Procedure.query.searchProceduresAutocomplete');
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
      Log.graphql('Procedure.query.searchProcedures');
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

    notifiedProcedures: isLoggedin.createResolver(
      async (parent, args, { device, ProcedureModel }) => {
        Log.graphql('Procedure.query.notifiedProcedures');
        const procedures = await ProcedureModel.find({
          _id: { $in: device.notificationSettings.procedures },
        });

        return procedures.map(procedure => ({
          ...procedure.toObject(),
          notify: true,
        }));
      },
    ),
  },

  Procedure: {
    activityIndex: async (procedure, args, { ActivityModel, phone, device }) => {
      Log.graphql('Procedure.field.activityIndex');
      const activityIndex = procedure.activities || 0;
      const active =
        (CONSTANTS.SMS_VERIFICATION && !phone) || (!CONSTANTS.SMS_VERIFICATION && !device)
          ? false
          : await ActivityModel.findOne({
              actor: CONSTANTS.SMS_VERIFICATION ? phone._id : device._id,
              kind: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
              procedure,
            });
      return {
        activityIndex,
        active: !!active,
      };
    },
    voted: async (procedure, args, { VoteModel, device, phone }) => {
      Log.graphql('Procedure.field.voted');
      const voted =
        (CONSTANTS.SMS_VERIFICATION && !phone) || (!CONSTANTS.SMS_VERIFICATION && !device)
          ? false
          : await VoteModel.findOne({
              procedure: procedure._id,
              voters: {
                $elemMatch: {
                  kind: CONSTANTS.SMS_VERIFICATION ? 'Phone' : 'Device',
                  voter: CONSTANTS.SMS_VERIFICATION ? phone._id : device._id,
                },
              },
            });
      return !!voted;
    },
    /* communityResults: async (procedure, args, { VoteModel }) => {
      Log.graphql('Procedure.field.voteResults');
      // if(!votedGovernment && !voted){
      //   return { yes: null, no: null, abstination: null }
      // }
      const result = await VoteModel.findOne({ procedure: procedure._id }, { voteResults: 1 });
      return CONSTANTS.SMS_VERIFICATION ? result.voteResults.phone : result.voteResults.device;
    }, */
    votedGovernment: procedure => {
      Log.graphql('Procedure.field.votedGovernment');
      return (
        procedure.voteResults &&
        (procedure.voteResults.yes || procedure.voteResults.abstination || procedure.voteResults.no)
      );
    },
    completed: procedure => {
      Log.graphql('Procedure.field.completed');
      return procedureStates.COMPLETED.includes(procedure.currentStatus);
    },
    listType: procedure => {
      Log.graphql('Procedure.field.listType');
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
    currentStatusHistory: ({ currentStatusHistory }) => {
      const cleanHistory = [...new Set(currentStatusHistory)];
      const referStatusIndex = cleanHistory.findIndex(status => status === 'Überwiesen');
      if (referStatusIndex !== -1) {
        cleanHistory.splice(referStatusIndex, 0, '1. Beratung');
      }

      const resultStaties = [
        'Angenommen',
        'Abgelehnt',
        'Abgeschlossen - Ergebnis siehe Vorgangsablauf',
        'Abgeschlossen',
        'Verkündet',
        'Verabschiedet',
        'Bundesrat hat zugestimmt',
        'Bundesrat hat Einspruch eingelegt',
        'Bundesrat hat Zustimmung versagt',
        'Bundesrat hat Vermittlungsausschuss nicht angerufen',
        'Im Vermittlungsverfahren',
        'Vermittlungsvorschlag liegt vor',
        'Für mit dem Grundgesetz unvereinbar erklärt',
        'Nicht ausgefertigt wegen Zustimmungsverweigerung des Bundespräsidenten',
        'Zustimmung versagt',
      ];
      const resultStatusIndex = cleanHistory.findIndex(status => resultStaties.includes(status));
      if (resultStatusIndex !== -1) {
        cleanHistory.splice(resultStatusIndex, 0, '2. Beratung / 3. Beratung');
      }
      return cleanHistory;
    },
  },
};
