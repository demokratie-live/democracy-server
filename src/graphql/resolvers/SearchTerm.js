/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Types } from 'mongoose';

export default {
  Query: {
    mostSearched: async (parent, {}, { SearchTermModel }) => SearchTermModel.find(),
  },
  Mutation: {
    finishSearch: async (parent, { term }, { SearchTermModel, user }) => {
      if (!user) {
        throw new Error('No auth');
      }
      SearchTermModel.findOneAndUpdate(
        {
          term: term.toLowerCase(),
        },
        {
          $push: {
            times: new Date(),
          },
        },
        {
          upsert: true,
        },
      ).then();
      return { term };
    },
  },
};
