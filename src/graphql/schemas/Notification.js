export default `

  type TokenResult {
      succeeded: Boolean
  }

  type Mutation {
    addToken(token: String!, os: String!): TokenResult
  }

  `;
