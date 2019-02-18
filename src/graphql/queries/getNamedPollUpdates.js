import gql from 'graphql-tag';

export default gql`
  query namedPollUpdates($since: Date!, $limit: Int, $offset: Int) {
    namedPollUpdates(since: $since, limit: $limit, offset: $offset) {
      beforeCount
      afterCount
      newCount
      changedCount
      namedPolls {
        procedureId
        votes {
          deputies {
            webId
            vote
          }
          inverseVoteDirection
        }
      }
    }
  }
`;
