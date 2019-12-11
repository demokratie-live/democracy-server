/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import _ from 'lodash';

import { PROCEDURE as PROCEDURE_DEFINITIONS } from '@democracy-deutschland/bundestag.io-definitions';
import PROCEDURE_STATES from '../../config/procedureStates';
import CONFIG from '../../config';

import elasticsearch from '../../services/search';

import { isLoggedin } from '../../express/auth/permissions';

export default {
  Query: {
    proceduresWithVoteResults: async (parent, { procedureIds }, { ProcedureModel }) => {
      const procedures = ProcedureModel.find({
        procedureId: { $in: procedureIds },
        'voteResults.yes': { $ne: null },
        'voteResults.no': { $ne: null },
        'voteResults.abstination': { $ne: null },
      });
      return procedures;
    },
    procedures: async (
      parent,
      {
        listTypes: listTypeParam,
        type,
        offset = 0,
        pageSize = 100,
        sort = 'lastUpdateDate',
        filter = {},
      },
      { ProcedureModel, user, VoteModel, device, phone },
    ) => {
      Log.graphql('Procedure.query.procedures');
      let listTypes = listTypeParam;
      if (type) {
        switch (type) {
          case 'VOTING':
            listTypes = ['IN_VOTE', 'PAST'];
            break;
          default:
            listTypes = [type];
            break;
        }
      }

      const filterQuery = {};
      if (filter.type && filter.type.length > 0) {
        filterQuery.type = { $in: filter.type };
      }
      if (filter.subjectGroups && filter.subjectGroups.length > 0) {
        filterQuery.subjectGroups = { $in: filter.subjectGroups };
      }
      if (filter.activity && filter.activity.length > 0 && user && user.isVerified()) {
        const votedProcedures = await VoteModel.find(
          {
            type: CONFIG.SMS_VERIFICATION ? 'Phone' : 'Device',
            voters: {
              $elemMatch: {
                voter: CONFIG.SMS_VERIFICATION ? phone._id : device._id,
              },
            },
          },
          { procedure: 1 },
        ).populate({ path: 'procedure', select: 'procedureId -_id' });
        if (filter.activity.indexOf('notVoted') !== -1) {
          if (Array.isArray(votedProcedures)) {
            filterQuery.procedureId = {
              $nin: votedProcedures.map(({ procedure: { procedureId } }) => procedureId),
            };
          }
        } else if (filter.activity.indexOf('voted') !== -1) {
          filterQuery.procedureId = {
            $in: votedProcedures.map(({ procedure: { procedureId } }) => procedureId),
          };
        }
      }

      let sortQuery = {};

      const period = { $gte: CONFIG.MIN_PERIOD };
      if (listTypes.indexOf('PREPARATION') > -1) {
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
          currentStatus: { $in: PROCEDURE_STATES.PREPARATION },
          period,
          voteDate: { $not: { $type: 'date' } },
          ...filterQuery,
        })
          .sort(sortQuery)
          .limit(pageSize)
          .skip(offset);
      }

      if (listTypes.indexOf('HOT') > -1) {
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

      if (listTypes.indexOf('TOP100') !== -1) {
        const top100Procedures = await ProcedureModel.find({
          period,
          ...filterQuery,
        })
          .sort({ activities: -1, lastUpdateDate: -1, title: 1 })
          .skip(offset)
          .limit(pageSize);

        return top100Procedures;
      }

      if (listTypes.indexOf('CONFERENCEWEEKS_PLANNED') !== -1) {
        const top100Procedures = await ProcedureModel.find({
          period,
          $or: [
            {
              $and: [
                { voteDate: { $gte: new Date() } },
                { $or: [{ voteEnd: { $exists: false } }, { voteEnd: { $eq: null } }] },
              ],
            },
            { voteEnd: { $gte: new Date() } },
          ],
          ...filterQuery,
        })
          .sort({ activities: -1, lastUpdateDate: -1, title: 1 })
          .skip(offset)
          .limit(pageSize);

        return top100Procedures;
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

      let activeVotings = [];
      if (listTypes.indexOf('IN_VOTE') > -1) {
        activeVotings = await ProcedureModel.aggregate([
          {
            $match: {
              $or: [
                {
                  currentStatus: { $in: [PROCEDURE_DEFINITIONS.STATUS.BESCHLUSSEMPFEHLUNG] },
                  voteDate: { $not: { $type: 'date' } },
                },
                {
                  currentStatus: {
                    $in: [
                      PROCEDURE_DEFINITIONS.STATUS.BESCHLUSSEMPFEHLUNG,
                      PROCEDURE_DEFINITIONS.STATUS.UEBERWIESEN,
                    ],
                  },
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
      }

      let pastVotings = [];
      if (listTypes.indexOf('PAST') > -1) {
        if (activeVotings.length < pageSize) {
          const activeVotingsCount =
            listTypes.indexOf('IN_VOTE') > -1
              ? await ProcedureModel.find({
                  $or: [
                    {
                      currentStatus: { $in: [PROCEDURE_DEFINITIONS.STATUS.BESCHLUSSEMPFEHLUNG] },
                      voteDate: { $not: { $type: 'date' } },
                    },
                    {
                      currentStatus: {
                        $in: [
                          PROCEDURE_DEFINITIONS.STATUS.BESCHLUSSEMPFEHLUNG,
                          PROCEDURE_DEFINITIONS.STATUS.UEBERWIESEN,
                        ],
                      },
                      voteDate: { $gte: new Date() },
                    },
                  ],
                  period,
                  ...filterQuery,
                }).count()
              : 0;

          pastVotings = await ProcedureModel.find({
            $or: [
              { voteDate: { $lt: new Date() } },
              { currentStatus: { $in: PROCEDURE_STATES.COMPLETED } },
            ],
            period,
            ...filterQuery,
          })
            .sort(sortQuery)
            .skip(Math.max(offset - activeVotingsCount, 0))
            .limit(pageSize - activeVotings.length);
        }
      }

      return [...activeVotings, ...pastVotings];
    },

    votedProcedures: async (parent, args, { VoteModel, phone, device, user }) => {
      Log.graphql('Procedure.query.votedProcedures');
      if (!user.isVerified()) {
        return null;
      }

      const actor = CONFIG.SMS_VERIFICATION ? phone._id : device._id;
      const kind = CONFIG.SMS_VERIFICATION ? 'Phone' : 'Device';
      const votedProcedures = await VoteModel.aggregate([
        {
          $match: {
            type: kind,
            voters: {
              $elemMatch: {
                voter: actor,
              },
            },
          },
        },
        {
          $lookup: {
            from: 'procedures',
            localField: 'procedure',
            foreignField: '_id',
            as: 'procedure',
          },
        },
        { $unwind: '$procedure' },
        {
          $lookup: {
            from: 'activities',
            let: { procedure: '$procedure._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$procedure', '$$procedure'] },
                      { $eq: ['$actor', actor] },
                      { $eq: ['$kind', kind] },
                    ],
                  },
                },
              },
            ],
            as: 'activitiesLookup',
          },
        },
        {
          $addFields: {
            'procedure.active': { $gt: [{ $size: '$activitiesLookup' }, 0] },
            'procedure.voted': true,
          },
        },
      ]);

      const procedures = votedProcedures.map(({ procedure }) => procedure);

      return procedures;
    },

    proceduresById: async (parent, { ids }, { ProcedureModel }) => {
      Log.graphql('Procedure.query.proceduresById');
      return ProcedureModel.find({ _id: { $in: ids } });
    },

    proceduresByIdHavingVoteResults: async (
      parent,
      { procedureIds, timespan = 'Period', pageSize = 25, offset = 0, filter = {} },
      { ProcedureModel },
    ) => {
      // Vote Results are present Filter
      const voteResultsQuery = {
        'voteResults.yes': { $ne: null },
        'voteResults.no': { $ne: null },
        'voteResults.abstination': { $ne: null },
        'voteResults.partyVotes': { $gt: [] },
      };

      // Timespan Selection
      const timespanQuery = {};
      switch (timespan) {
        case 'CurrentSittingWeek':
        case 'LastSittingWeek':
          throw new Error('Not implemented/Not supported yet');
        case 'CurrentQuarter':
          {
            const now = new Date();
            const quarter = Math.floor(now.getMonth() / 3);
            const firstDate = new Date(now.getFullYear(), quarter * 3, 1);
            const endDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + 3, 0);
            timespanQuery.voteDate = {
              $gte: firstDate,
              $lt: endDate,
            };
          }
          break;
        case 'LastQuarter':
          {
            const now = new Date();
            let year = now.getFullYear();
            let quarter = Math.floor(now.getMonth() / 3) - 1;
            if (quarter === -1) {
              quarter = 3;
              year -= 1;
            }
            const firstDate = new Date(year, quarter * 3, 1);
            const endDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + 3, 0);
            timespanQuery.voteDate = {
              $gte: firstDate,
              $lt: endDate,
            };
          }
          break;
        case 'CurrentYear':
          timespanQuery.voteDate = { $gte: new Date(new Date().getFullYear(), 0, 1) };
          break;
        case 'LastYear':
          timespanQuery.voteDate = {
            $gte: new Date(new Date().getFullYear() - 1, 0, 1),
            $lt: new Date(new Date().getFullYear(), 0, 1),
          };
          break;
        case 'Period':
          timespanQuery.period = { $in: CONFIG.MIN_PERIOD };
          break;
        default:
      }

      // WOM Filter
      const filterQuery = {};
      // WOM Filter Subject Group
      if (filter.subjectGroups && filter.subjectGroups.length > 0) {
        filterQuery.subjectGroups = { $in: filter.subjectGroups };
      }

      // Prepare Find Query
      const findQuery = {
        // Vote Results are present
        ...voteResultsQuery,
        // Timespan Selection
        ...timespanQuery,
        // Apply Filter
        ...filterQuery,
      };

      // Count total Procedures matching given Filter
      const total = await ProcedureModel.count(findQuery);

      // if empty, return all procedures having VoteResults
      if (procedureIds) {
        // Procedure ID selection
        findQuery.procedureId = { $in: procedureIds };
      }

      // Find selected procedures matching given Filter
      let procedures = await ProcedureModel.find(findQuery)
        // Sorting last voted first
        .sort({ voteDate: -1 })
        // Pagination
        .limit(pageSize)
        .skip(offset);

      // Filter Andere(fraktionslos) from partyVotes array in result, rename party(CDU -> Union)
      procedures = procedures.map(p => {
        // MongoObject to JS Object
        const procedure = p.toObject();
        // eslint-disable-next-line no-param-reassign
        procedure.voteResults.partyVotes = procedure.voteResults.partyVotes.filter(
          ({ party }) => !['Andere', 'fraktionslos'].includes(party.trim()),
        );

        // Rename Fractions
        procedure.voteResults.partyVotes = procedure.voteResults.partyVotes.map(
          ({ party, ...rest }) => {
            switch (party.trim()) {
              case 'CDU':
                return { ...rest, party: 'Union' };

              default:
                return { ...rest, party };
            }
          },
        );
        return { ...procedure };
      });

      // Return result
      return { total, procedures };
    },

    procedure: async (parent, { id }, { user, device, ProcedureModel }) => {
      Log.graphql('Procedure.query.procedure');
      const procedure = await ProcedureModel.findOne({ procedureId: id });
      // TODO fail here of procedure is null
      if (!procedure) {
        return null;
      }
      // eslint-disable-next-line
      const listType = PROCEDURE_STATES.IN_VOTE.concat(PROCEDURE_STATES.COMPLETED).some(
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
    communityVotes: async (procedure, { constituencies }, { VoteModel }) => {
      Log.graphql('Procedure.query.communityVotes');
      // Find global result(cache), not including constituencies
      const votesGlobal = await VoteModel.aggregate([
        // Find Procedure
        {
          $match: {
            procedure: procedure._id,
            type: CONFIG.SMS_VERIFICATION ? 'Phone' : 'Device',
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
        {
          $addFields: {
            total: { $add: ['$yes', '$no', '$abstination'] },
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
                  type: CONFIG.SMS_VERIFICATION ? 'Phone' : 'Device',
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
              {
                $addFields: {
                  total: { $add: ['$yes', '$no', '$abstain'] },
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
                  total: '$total',
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
    activityIndex: async (procedure, args, { ActivityModel, phone, device }) => {
      Log.graphql('Procedure.field.activityIndex');
      const activityIndex = procedure.activities || 0;
      let { active } = procedure;
      if (active === undefined) {
        active =
          (CONFIG.SMS_VERIFICATION && !phone) || (!CONFIG.SMS_VERIFICATION && !device)
            ? false
            : await ActivityModel.findOne({
                actor: CONFIG.SMS_VERIFICATION ? phone._id : device._id,
                kind: CONFIG.SMS_VERIFICATION ? 'Phone' : 'Device',
                procedure,
              });
      }
      return {
        activityIndex,
        active: !!active,
      };
    },
    voted: async (procedure, args, { VoteModel, device, phone }) => {
      Log.graphql('Procedure.field.voted');
      let { voted } = procedure;

      if (voted === undefined) {
        voted =
          (CONFIG.SMS_VERIFICATION && !phone) || (!CONFIG.SMS_VERIFICATION && !device)
            ? false
            : await VoteModel.findOne({
                procedure: procedure._id,
                type: CONFIG.SMS_VERIFICATION ? 'Phone' : 'Device',
                voters: {
                  $elemMatch: {
                    voter: CONFIG.SMS_VERIFICATION ? phone._id : device._id,
                  },
                },
              });
      }
      return !!voted;
    },
    votedGovernment: procedure => {
      Log.graphql('Procedure.field.votedGovernment');
      return (
        procedure.voteResults &&
        (procedure.voteResults.yes || procedure.voteResults.abstination || procedure.voteResults.no)
      );
    },
    completed: procedure => {
      Log.graphql('Procedure.field.completed');
      return PROCEDURE_STATES.COMPLETED.includes(procedure.currentStatus);
    },
    // DEPRECATED ListType 2019-01-29 use list instead
    listType: procedure => {
      Log.graphql('Procedure.field.listType');
      if (
        procedure.currentStatus === PROCEDURE_DEFINITIONS.STATUS.BESCHLUSSEMPFEHLUNG ||
        (procedure.currentStatus === PROCEDURE_DEFINITIONS.STATUS.UEBERWIESEN &&
          procedure.voteDate &&
          new Date(procedure.voteDate) >= new Date()) ||
        PROCEDURE_STATES.COMPLETED.some(s => s === procedure.currentStatus || procedure.voteDate)
      ) {
        return 'VOTING';
      }
      return 'PREPARATION';
    },
    list: procedure => {
      Log.graphql('Procedure.field.list');
      if (procedure.voteDate && new Date(procedure.voteDate) < new Date()) {
        return 'PAST';
      }
      if (
        procedure.currentStatus === PROCEDURE_DEFINITIONS.STATUS.BESCHLUSSEMPFEHLUNG ||
        (procedure.currentStatus === PROCEDURE_DEFINITIONS.STATUS.UEBERWIESEN &&
          procedure.voteDate &&
          new Date(procedure.voteDate) >= new Date()) ||
        PROCEDURE_STATES.COMPLETED.some(s => s === procedure.currentStatus || procedure.voteDate)
      ) {
        return 'IN_VOTE';
      }
      return 'PREPARATION';
    },
    currentStatusHistory: ({ currentStatusHistory }) => {
      const cleanHistory = [...new Set(currentStatusHistory)];
      const referStatusIndex = cleanHistory.findIndex(
        status => status === PROCEDURE_DEFINITIONS.STATUS.UEBERWIESEN,
      );
      if (referStatusIndex !== -1) {
        cleanHistory.splice(referStatusIndex, 0, '1. Beratung');
      }

      const resultStaties = [
        PROCEDURE_DEFINITIONS.STATUS.ANGENOMMEN,
        PROCEDURE_DEFINITIONS.STATUS.ABGELEHNT,
        PROCEDURE_DEFINITIONS.STATUS.ABBESCHLOSSEN_VORGANGSABLAUF,
        PROCEDURE_DEFINITIONS.STATUS.ABGESCHLOSSEN,
        PROCEDURE_DEFINITIONS.STATUS.VERKUENDET,
        PROCEDURE_DEFINITIONS.STATUS.VERABSCHIEDET,
        PROCEDURE_DEFINITIONS.STATUS.BR_ZUGESTIMMT,
        PROCEDURE_DEFINITIONS.STATUS.BR_EINSPRUCH,
        PROCEDURE_DEFINITIONS.STATUS.BR_ZUSTIMMUNG_VERSAGT,
        PROCEDURE_DEFINITIONS.STATUS.BR_VERMITTLUNGSAUSSCHUSS_NICHT_ANGERUFEN,
        PROCEDURE_DEFINITIONS.STATUS.VERMITTLUNGSVERFAHREN,
        PROCEDURE_DEFINITIONS.STATUS.VERMITTLUNGSVORSCHLAG,
        PROCEDURE_DEFINITIONS.STATUS.UNVEREINBAR_MIT_GRUNDGESETZ,
        PROCEDURE_DEFINITIONS.STATUS.BP_ZUSTIMMUNGSVERWEIGERUNG,
        PROCEDURE_DEFINITIONS.STATUS.ZUSTIMMUNG_VERSAGT,
      ];
      const resultStatusIndex = cleanHistory.findIndex(status => resultStaties.includes(status));
      if (resultStatusIndex !== -1) {
        cleanHistory.splice(resultStatusIndex, 0, '2. Beratung / 3. Beratung');
      }
      return cleanHistory;
    },
    // Propagate procedureId if present
    voteResults: ({ voteResults, procedureId }) => ({ ...voteResults, procedureId }),
  },
};
