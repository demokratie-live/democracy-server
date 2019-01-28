import DeputyModel from '../../models/Deputy';

export default {
  Query: {
    deputiesOfConstituency: async (parent, { constituency, directCandidate = false }) => {
      const query = {
        constituency,
      };
      if (directCandidate) {
        // returns only directCandidate
        query.directCandidate = true;
      }
      return DeputyModel.find(query);
    },
  },
};
