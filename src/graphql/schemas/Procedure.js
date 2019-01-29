export default `
${/* DEPRECATED ListType 2019-01-29 Renamed filed VOTING to PAST and IN_VOTE */ ''}
enum ProcedureType @deprecated(reason: "User procedures Query param listTypes instead of type") {
  PREPARATION @deprecated(reason: "User procedures Query param listTypes instead of type")
  VOTING @deprecated(reason: "User procedures Query param listTypes instead of type")
  PAST @deprecated(reason: "User procedures Query param listTypes instead of type")
  HOT @deprecated(reason: "User procedures Query param listTypes instead of type")
} 

enum ListType {
  PREPARATION
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
  listType: ProcedureType @deprecated(reason: "DEPRECATED ListType 2019-01-29 Renamed filed VOTING to PAST and IN_VOTE")
  list: ListType
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
  ${/* DEPRECATED listType 2019-01-29 Renamed filed VOTING to PAST and IN_VOTE */ ''}
  procedures(listTypes: [ListType!], type: ProcedureType @deprecated(reason: "User listTypes instead of type"), pageSize: Int, offset: Int, sort: String, filter: ProcedureFilter): [Procedure]
  proceduresById(ids: [String!]!, pageSize: Int, offset: Int): [Procedure]
  notifiedProcedures: [Procedure]
  searchProcedures(term: String!): [Procedure] @deprecated(reason: "use searchProceduresAutocomplete")
  searchProceduresAutocomplete(term: String!): SearchProcedures
  votedProcedures: [Procedure]
}
`;
