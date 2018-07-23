export default `
  type User {
    _id: String!
    verified: Boolean!
  }
  
  type Auth {
    token: String!
  }
  
  type Mutation {
    signUp(deviceHashEncrypted: String!): Auth
  }
  
  type Query {
    me: User
  }
  `;
