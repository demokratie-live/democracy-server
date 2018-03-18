export default `

type ActivityIndex {
  activityIndex: Int
}

type Query {
  activityIndex(procedureId: String!): ActivityIndex
}
 
type Mutation {
  increaseActivity(procedureId: String!): ActivityIndex
}
`;
