import DeputyModel from '../../models/Deputy';

export default {
  Query: {
    deputyOfConstituency: async (parent, { constituency } /* {}, */) =>
      DeputyModel.findOne({ constituency, directCandidate: true }),
  },
};
