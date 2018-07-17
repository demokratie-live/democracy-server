/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Types } from 'mongoose';
import CONSTANTS from '../../config/constants';
import { isLoggedin, isVerified } from '../../express/auth/permissions';

export default {
  Query: {
    activityIndex: isLoggedin.createResolver(async (parent, { procedureId },
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
    increaseActivity: isVerified.createResolver(async (parent,
      { procedureId }, {
        ProcedureModel,
        ActivityModel,
        device,
        phone,
      }) => {
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
        user: CONSTANTS.SMS_VERIFICATION ? phone._id : device._id,
        procedure,
      });
      if (!active) {
        active = await ActivityModel.create({
          user: CONSTANTS.SMS_VERIFICATION ? phone._id : device._id,
          procedure,
        });
      }
      const activityIndex = await ActivityModel.find({ procedure }).count();
      return { activityIndex, active };
    }),
  },
};
