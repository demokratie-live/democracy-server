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
      console.log(_.omitBy(
        {
          enabled,
          disableUntil,
          procedures,
          tags,
          newVote,
          newPreperation,
        },
        _.isNil,
      ));
      console.log(user);
      await user.save();
      return user.notificationSettings;
    },
  },
};
