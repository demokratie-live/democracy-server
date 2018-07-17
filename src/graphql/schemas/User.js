export default `
  type User {
    _id: String!
    device: Device!
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
