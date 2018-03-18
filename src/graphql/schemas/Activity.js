export default `

type ActivityIndex {
  index: Int
}

type Query {
  activityIndex(procedureId: Int!): ActivityIndex
}
 
type Mutation {
  increaseActivity(procedureId: Int!): Procedure
}
`;
