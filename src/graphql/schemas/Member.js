export default `
type SocialMedia {
  service: String!
  url: String!
}

type MemberContact {
  address: String
  email: String
  socialMedia: [SocialMedia]
}

type Member {
  _id: ID!
  imgURL: String!
  name: String!
  party: String
  job: String
  bio: String
  constituency: String
  period: Int!
  contact: MemberContact
}

type Query {
  memberByConstituencyPeriod(constituency: String!, period: Int): Member
}
`;
