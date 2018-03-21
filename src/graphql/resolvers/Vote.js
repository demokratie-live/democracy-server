/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

export default {
  Query: {
    votes: (parent, { procedure }, { VoteModel }) =>
      VoteModel.findOne({ procedure }).then(result => result.voteResults),
  },

  Mutation: {
    vote: async (parent, { procedure, selection }, { VoteModel, user }) => {
      // TODO check if procedure is votable
      let vote = await VoteModel.findOne({ procedure });
      if (!vote) {
        console.log('### Create new Vote Instance');
        vote = await VoteModel.create({ procedure });
      }
      const hasVoted = vote.users.some(uId => uId.equals(user._id));
      if (!hasVoted) {
        const voteUpdate = { $push: { users: user } };
        switch (selection) {
          case 'YES':
            voteUpdate.$inc = { 'voteResults.yes': 1 };
            break;
          case 'NO':
            voteUpdate.$inc = { 'voteResults.no': 1 };
            break;
          case 'ABSTINATION':
            voteUpdate.$inc = { 'voteResults.abstination': 1 };
            break;

          default:
            break;
        }
        return VoteModel.findByIdAndUpdate(vote._id, voteUpdate, {
          new: true,
        }).then(result => result.voteResults);
      }
      return vote.voteResults;
    },
  },
};
