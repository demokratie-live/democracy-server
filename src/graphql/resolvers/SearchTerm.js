/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

export default {
  Query: {
    mostSearched: async (parent, args, { SearchTermModel }) => {
      const result = await SearchTermModel.aggregate([
        { $unwind: '$times' },
        {
          $group: {
            _id: '$term',
            times: { $push: '$times' },
            size: { $sum: 1 },
          },
        },
        { $sort: { size: -1 } },
        { $limit: 10 },
      ]);
      return result.map(({ _id }) => ({ term: _id }));
    },
  },
  Mutation: {
    finishSearch: async (parent, { term }, { SearchTermModel, user }) => {
      if (!user) {
        throw new Error('No auth');
      }
      if (term && term.trim().length >= 3) {
        SearchTermModel.findOneAndUpdate(
          {
            term: term.toLowerCase().trim(),
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
      }
      return { term };
    },
  },
};
