/* eslint-disable no-underscore-dangle */

export default {
  Query: {},

  Mutation: {
    increaseActivity: async (parent, { procedureId }, { ProcedureModel, ActivityModel, user }) => {
      console.log('########### increaseActivity', user);
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
      return { ...procedure.toObject(), activityIndex };
    },
  },
};
