/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
export default {
  Query: {
    procedures: async (parent, { type, offset, pageSize }, { ProcedureModel }) => {
      let currentStates = [];
      switch (type) {
        case 'PREPARATION':
          currentStates = [
            'Dem Bundesrat zugeleitet - Noch nicht beraten',
            'Dem Bundestag zugeleitet - Noch nicht beraten',
            'Den Ausschüssen zugewiesen',
            'Einbringung abgelehnt',
            '1. Durchgang im Bundesrat abgeschlossen',
            'Überwiesen',
            'Noch nicht beraten',
            'Keine parlamentarische Behandlung',
            'Nicht abgeschlossen - Einzelheiten siehe Vorgangsablauf',
          ];
          break;
        case 'VOTING':
          currentStates = [
            'Beschlussempfehlung liegt vor',
            // Unterhalb keys für Vergangen
            'Erledigt durch Ablauf der Wahlperiode',
            'Zurückgezogen',
            'Abgeschlossen - Ergebnis siehe Vorgangsablauf',
            'Für nichtig erklärt',
            'Verkündet',
            'Zusammengeführt mit... (siehe Vorgangsablauf)',
            'Für erledigt erklärt',
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
            'Teile des Gesetzes für nichtig erklärt',
            'Für gegenstandslos erklärt',
          ];
          break;
        case 'HOT':
          currentStates = [];
          break;

        default:
          break;
      }

      let period = { $gte: 19 };
      let sort = { voteDate: -1 };
      if (type === 'PREPARATION') {
        period = { $gte: 19 };
        sort = { lastUpdateDate: -1 };
        return ProcedureModel.find({ currentStatus: { $in: currentStates }, period })
          .sort(sort)
          .skip(offset)
          .limit(pageSize);
      }
      if (type === 'HOT') {
        const oneWeekAgo = new Date();
        period = { $gte: 19 };
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

          { $skip: offset },
          { $limit: pageSize },
        ]);

        return hotProcedures;
      }

      const activeVotings = await ProcedureModel.find({
        voteDate: { $exists: false },
        currentStatus: { $in: currentStates },
        period,
      })
        .sort({ lastUpdateDate: -1 })
        .skip(offset)
        .limit(pageSize);

      return ProcedureModel.find({
        voteDate: { $exists: true },
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
      return {
        ...procedure.toObject(),
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
          period: 19,
        },
        { score: { $meta: 'textScore' } },
      ).sort({ score: { $meta: 'textScore' } }),
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
  },
};
