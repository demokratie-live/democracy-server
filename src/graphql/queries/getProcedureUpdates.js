import gql from 'graphql-tag';

export default gql`
  query procedureUpdates($pageSize: Int, $period: [Int!], $type: [String!]) {
    procedureUpdates(pageSize: $pageSize, period: $period, type: $type) {
      procedureId
      updatedAt
    }
  }
`;
