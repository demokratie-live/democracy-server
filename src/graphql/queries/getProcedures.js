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
