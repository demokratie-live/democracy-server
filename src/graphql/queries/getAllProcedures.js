import gql from 'graphql-tag';

export default gql`
  query allProcedures {
    allProcedures {
      title
      procedureId
      type
      period
      currentStatus
      currentStatusHistory
      abstract
      tags
      bioUpdateAt
      subjectGroups
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
      customData {
        voteResults {
          yes
          no
          abstination
        }
      }
    }
  }
`;
