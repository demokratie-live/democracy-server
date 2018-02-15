import gql from 'graphql-tag';

export default gql`
  query allprocedures($pageSize: Int) {
    allprocedures(pageSize: $pageSize) {
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
