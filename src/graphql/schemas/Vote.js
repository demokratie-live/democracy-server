export default `

  enum VoteSelection {
    YES
    NO
    ABSTINATION
    NOTVOTED
  }

  type UserVotes {
    yes: Int
    no: Int
    abstination: Int
  }

  type CommunityVotes {
    yes: Int
    no: Int
    abstination: Int
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
    votes: UserVotes
  }

  type VoteStatistic {
    proceduresCount: Int
    votedProcedures: Int
  }
  
  type Mutation {
    vote(procedure: ID!, selection: VoteSelection!, constituency: String): Vote
  }
  

  type Query {
    votes(procedure: ID!, constituency: String): Vote
    communityVotes(procedure: ID!): CommunityVotes
    voteStatistic: VoteStatistic
  }
  `;
