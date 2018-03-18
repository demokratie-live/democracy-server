/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

export default {
  Query: {
    activityIndex: async (parent, { procedureId }, { ProcedureModel, ActivityModel, user }) => {
      if (!user) {
        throw new Error('No auth');
      }
      const procedure = await ProcedureModel.findOne({ procedureId });
      const activityIndex = await ActivityModel.find({ procedure }).count();
      return {
        activityIndex,
      };
    },
  },

  Mutation: {
    increaseActivity: async (parent, { procedureId }, { ProcedureModel, ActivityModel, user }) => {
      if (!user) {
        throw new Error('No auth');
      }
      const procedure = await ProcedureModel.findOne({ procedureId });
      if (!procedure) {
        throw new Error('Procedure not found');
      }
      const activity = await ActivityModel.findOne({
        user,
        procedure,
      });
      if (!activity) {
        await ActivityModel.create({ user, procedure });
      }
      const activityIndex = await ActivityModel.find({ procedure }).count();
      return { activityIndex };
    },
  },
};
