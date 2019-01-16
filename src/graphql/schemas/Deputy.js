export default `
type DeputyLink {
  name: String!
  URL: String!
}

type DeputyContact {
  address: String
  email: String
  links: [DeputyLink]
}

type Deputy {
  _id: ID!
  webId: String!
  imgURL: String!
  name: String!
  party: String
  job: String
  biography: String
  constituency: String
  contact: DeputyContact
}

type Query {
  deputyByConstituency(constituency: String!): Deputy
}
`;
