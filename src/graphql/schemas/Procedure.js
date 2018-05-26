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
  activityIndex: ActivityIndex
  importantDocuments: [Document]
  voteResults: VoteResult
  voted: Boolean
  votedGovernment: Boolean
  votedGoverment: Boolean
  completed: Boolean
  notify: Boolean
  listType: ProcedureType
}

type Query {
  procedure(id: ID!): Procedure
  procedures(type: ProcedureType!, pageSize: Int, offset: Int): [Procedure]
  proceduresById(ids: [String!]!, pageSize: Int, offset: Int): [Procedure]
  notifiedProcedures: [Procedure]
  searchProcedures(term: String!): [Procedure]
}
`;
