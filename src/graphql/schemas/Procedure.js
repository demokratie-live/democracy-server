export default `
enum ProcedureType {
  PREPARATION
  VOTING @deprecated
  IN_VOTE
  PAST
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

input ProcedureWOMFilter {
  subjectGroups: [String]
}

enum VotedTimeSpan {
  CurrentSittingWeek
  LastSittingWeek
  CurrentQuarter
  LastQuarter
  CurrentYear
  LastYear
  Period
}

type ProceduresHavingVoteResults {
  total: Int
  procedures: [Procedure]
}

type Query {
  procedure(id: ID!): Procedure
  procedures(listTypes: [ProcedureType!], type: ProcedureType, pageSize: Int, offset: Int, sort: String, filter: ProcedureFilter): [Procedure]
  proceduresById(ids: [String!]!, pageSize: Int, offset: Int): [Procedure]
  proceduresByIdHavingVoteResults(procedureIds: [String!]!, timespan: VotedTimeSpan, pageSize: Int, offset: Int, filter: ProcedureWOMFilter): ProceduresHavingVoteResults
  notifiedProcedures: [Procedure]
  searchProcedures(term: String!): [Procedure] @deprecated(reason: "use searchProceduresAutocomplete")
  searchProceduresAutocomplete(term: String!): SearchProcedures
  votedProcedures: [Procedure]
  proceduresWithVoteResults(procedureIds: [String!]!): [Procedure]
}
`;
