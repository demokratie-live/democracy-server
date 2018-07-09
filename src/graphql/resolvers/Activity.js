/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Types } from 'mongoose';
import { isUser } from '../../express/auth/permissions';

export default {
  Query: {
    activityIndex: isUser.createResolver(async (parent, { procedureId },
      { ProcedureModel, ActivityModel, user }) => {
      const procedure = await ProcedureModel.findOne({ procedureId });
      const activityIndex = await ActivityModel.find({ procedure }).count();
      const active = await ActivityModel.findOne({
        user,
        procedure,
      });
      return {
        activityIndex,
        active: !!active,
      };
    }),
  },

  Mutation: {
    increaseActivity: isUser.createResolver(async (parent,
      { procedureId }, { ProcedureModel, ActivityModel, user }) => {
      let searchQuery;
      if (Types.ObjectId.isValid(procedureId)) {
        searchQuery = { _id: Types.ObjectId(procedureId) };
      } else {
        searchQuery = { procedureId };
      }
      const procedure = await ProcedureModel.findOne(searchQuery);
      if (!procedure) {
        throw new Error('Procedure not found');
      }
      let active = await ActivityModel.findOne({
        user,
        procedure,
      });
      if (!active) {
        active = await ActivityModel.create({ user, procedure });
      }
      const activityIndex = await ActivityModel.find({ procedure }).count();
      return { activityIndex, active };
    }),
  },
};
