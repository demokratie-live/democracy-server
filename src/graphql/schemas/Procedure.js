export default `
enum ProcedureType {
  PREPARATION
  VOTING
  HOT
}

type Procedure {
  _id: ID!
  title: String!
  procedureId: String!
  type: String
  period: Int
  currentStatus: String
  abstract: String
  tags: [String]
  voteDate: Date
  subjectGroups: [String]
  submissionDate: Date
  activityIndex: Int
  importantDocuments: [Document]
}

type Query {
  procedure(id: ID!): Procedure
  procedures(type: ProcedureType!, pageSize: Int, offset: Int): [Procedure]
  searchProcedures(term: String!): [Procedure]
}
`;
