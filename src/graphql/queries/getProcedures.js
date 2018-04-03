import gql from 'graphql-tag';

export default gql`
  query procedures($IDs: [String!]) {
    procedures(IDs: $IDs) {
      title
      procedureId
      type
      period
      currentStatus
      abstract
      tags
      subjectGroups
      bioUpdateAt
      history {
        assignment
        initiator
        decision {
          tenor
          type
          comment
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
