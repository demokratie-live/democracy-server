import gql from 'graphql-tag';

export default gql`
  query allProcedures($pageSize: Int) {
    allProcedures(pageSize: $pageSize) {
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
