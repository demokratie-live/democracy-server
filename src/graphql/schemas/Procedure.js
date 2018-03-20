export default `
enum ProcedureType {
  PREPARATION
  VOTING
  HOT
}

type VoteResult {
  yes: Int
  no: Int
  abstination: Int
  notVote: Int
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
  activityIndex: ActivityIndex
  importantDocuments: [Document]
  voteResults: VoteResult
}

type Query {
  procedure(id: ID!): Procedure
  procedures(type: ProcedureType!, pageSize: Int, offset: Int): [Procedure]
  searchProcedures(term: String!): [Procedure]
}
`;
