/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

export default {
  Query: {},

  Mutation: {
    addToken: async (parent, { token, os }, { user }) => {
      console.log('x');
      console.log(` ### addToken ### , Token: "${token}, os: "${os}"`);
      console.log('y');
    },
  },
};
