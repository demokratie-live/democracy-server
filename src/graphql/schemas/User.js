export default `
  type User {
    _id: String!
    deviceHash: String!
  }
  
  type Auth {
    token: String!
  }
  
  type Mutation {
    signUp(deviceHashEncrypted: String!): Auth
    signIn(deviceHashEncrypted: String!): Auth
  }
  
  type Query {
    me: User
  }
  `;
