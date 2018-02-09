import gql from 'graphql-tag';

export default gql`
  {
    procedures {
      title
      procedureId
      type
      period
      currentStatus
      abstract
      tags
    }
  }
`;
