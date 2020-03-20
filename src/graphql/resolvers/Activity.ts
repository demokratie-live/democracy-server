/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Types } from 'mongoose';
import CONFIG from '../../config';

export default {
  Query: {
    activityIndex: async (parent, { procedureId }, { ProcedureModel, ActivityModel, user }) => {
      global.Log.graphql('Activity.query.activityIndex');
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
    },
  },

  Mutation: {
    increaseActivity: async (
      parent,
      { procedureId },
      { ProcedureModel, ActivityModel, device, phone },
    ) => {
      global.Log.graphql('Activity.mutation.increaseActivity');
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
        actor: CONFIG.SMS_VERIFICATION ? phone._id : device._id,
        kind: CONFIG.SMS_VERIFICATION ? 'Phone' : 'Device',
        procedure,
      });
      if (!active) {
        active = await ActivityModel.create({
          actor: CONFIG.SMS_VERIFICATION ? phone._id : device._id,
          kind: CONFIG.SMS_VERIFICATION ? 'Phone' : 'Device',
          procedure,
        });
      }
      const activityIndex = await ActivityModel.find({ procedure }).count();
      return { activityIndex, active: !!active };
    },
  },
};
