import DeputyModel from '../../models/Deputy';

export default {
  Query: {
    deputyByConstituency: async (parent, { constituency } /* {}, */) =>
      DeputyModel.findOne({ constituency }),
  },
};
