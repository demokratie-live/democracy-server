/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
export default {
  Query: {
    procedures: (parent, args, { ProcedureModel }) => ProcedureModel.find(),
  },
};
