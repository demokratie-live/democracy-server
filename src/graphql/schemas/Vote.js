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
    notVoted: Int
    notVote: Int @deprecated
    decisionText: String
    namedVote: Boolean
    partyVotes: [PartyVote]
  }

  type PartyVote {
    party: String!
    main: VoteSelection
    deviants: Deviants
  }

  type Deviants {
    yes: Int
    abstination: Int
    no: Int
    notVoted: Int
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
