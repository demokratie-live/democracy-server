import gql from 'graphql-tag';

export default gql`
  query procedureUpdates($period: [Int!], $type: [String!]) {
    procedureUpdates(period: $period, type: $type) {
      procedureId
      updatedAt
    }
  }
`;
