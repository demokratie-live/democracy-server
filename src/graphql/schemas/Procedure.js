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
  currentStatusHistory: [String]
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
  completed: Boolean
  notify: Boolean
  listType: ProcedureType
  verified: Boolean
}

type SearchProcedures {
  procedures: [Procedure]
  autocomplete: [String]
}

input ProcedureFilter {
  subjectGroups: [String]
  status: [String]
  type: [String]
  activity: [String]
}

type Query {
  procedure(id: ID!): Procedure
  procedures(type: ProcedureType!, pageSize: Int, offset: Int, sort: String, filter: ProcedureFilter): [Procedure]
  proceduresById(ids: [String!]!, pageSize: Int, offset: Int): [Procedure]
  notifiedProcedures: [Procedure]
  searchProcedures(term: String!): [Procedure] @deprecated(reason: "use searchProceduresAutocomplete")
  searchProceduresAutocomplete(term: String!): SearchProcedures
}
`;
