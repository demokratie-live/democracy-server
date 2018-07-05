import gql from 'graphql-tag';

export default gql`
  query procedures($IDs: [String!]) {
    procedures(IDs: $IDs) {
      title
      procedureId
      type
      period
      currentStatus
      currentStatusHistory
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
      customData {
        expectedVotingDate
        voteResults {
          yes
          no
          abstination
          notVoted
          partyVotes {
            party
            main
            deviants {
              yes
              no
              abstination
              notVoted
            }
          }
        }
      }
    }
  }
`;
