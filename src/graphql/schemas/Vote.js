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

  type Statistic {
    proceduresCount: Int
    votedProcedures: Int
  }
  
  type Mutation {
    vote(procedure: ID!, selection: VoteSelection!): Vote
  }
  
  type Query {
    votes(procedure: ID!): Vote
    voteStatistic: Statistic
  }
  `;
