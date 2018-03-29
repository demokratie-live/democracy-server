/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

export default {
  Query: {},

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
  },
};
