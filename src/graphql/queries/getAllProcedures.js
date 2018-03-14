import gql from 'graphql-tag';

export default gql`
  query allProcedures() {
    allProcedures() {
      title
      procedureId
      type
      period
      currentStatus
      abstract
      tags
      subjectGroups
      history {
        assignment
        initiator
        decision {
          tenor
        }
        date
      }
      importantDocuments {
        editor
        type
        url
        number
      }
    }
  }
`;
