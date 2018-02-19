import gql from 'graphql-tag';

export default gql`
  query procedures($pageSize: Int, $IDs: [String!]) {
    procedures(pageSize: $pageSize, IDs: $IDs) {
      title
      procedureId
      type
      period
      currentStatus
      abstract
      tags
      history {
        assignment
        decision {
          tenor
        }
        date
      }
    }
  }
`;
