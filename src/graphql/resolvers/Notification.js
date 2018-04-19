/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
/* eslint no-param-reassign: 0 */

import _ from 'lodash';

export default {
  Query: {
    notificationSettings: async (parent, args, { user }) => {
      if (!user) {
        throw new Error('no Auth');
      }
      return user.notificationSettings;
    },
  },

  Mutation: {
    addToken: async (parent, { token, os }, { user }) => {
      if (!user) {
        throw new Error('no Auth');
      }
      if (!user.pushTokens.some(t => t.token === token)) {
        user.pushTokens.push({ token, os });
        user.save();
      }
      return {
        succeeded: true,
      };
    },

    updateNotificationSettings: async (
      parent,
      {
        enabled, disableUntil, procedures, tags, newVote, newPreperation,
      },
      { user },
    ) => {
      if (!user) {
        throw new Error('no Auth');
      }
      user.notificationSettings = {
        ...user.notificationSettings,
        ..._.omitBy(
          {
            enabled,
            disableUntil,
            procedures,
            tags,
            newVote,
            newPreperation,
          },
          _.isNil,
        ),
      };
      await user.save();
      return user.notificationSettings;
    },

    toggleNotification: async (parent, { procedureId }, { user, ProcedureModel }) => {
      if (!user) {
        throw new Error('no Auth');
      }
      const procedure = await ProcedureModel.findOne({ procedureId });

      const index = user.notificationSettings.procedures.indexOf(procedure._id);
      let notify;
      if (index > -1) {
        notify = false;
        user.notificationSettings.procedures.splice(index, 1);
      } else {
        notify = true;
        user.notificationSettings.procedures.push(procedure._id);
      }
      await user.save();
      return { ...procedure.toObject(), notify };
    },
  },
};
