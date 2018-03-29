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
        disableAll, disableUntil, procedures, tags,
      },
      { user },
    ) => {
      user.notificationSettings = {
        ...user.notificationSettings,
        ..._.omitBy(
          {
            disableAll,
            disableUntil,
            procedures,
            tags,
          },
          _.isNil,
        ),
      };
      console.log(user);
      await user.save();
      return user.notificationSettings;
    },
  },
};
