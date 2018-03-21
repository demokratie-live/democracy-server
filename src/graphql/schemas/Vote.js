export default `

  enum VoteSelection {
    YES
    NO
    ABSTINATION
  }

  type VoteResult {
    yes: Int
    no: Int
    abstination: Int
    notVote: Int
  }

  type Vote {
    _id: ID!
    voted: Boolean
    voteResults: VoteResult
  }
  
  type Mutation {
    vote(procedure: ID!, selection: VoteSelection!): VoteResult
  }
  
  type Query {
    votes(procedure: ID!): VoteResult
  }
  `;
