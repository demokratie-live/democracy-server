import createClient from '../graphql/client';
import Procedure from '../models/Procedure';
import getProcedures from '../graphql/queries/getProcedures';

export default async (procedureIds) => {
  const client = createClient();
  // Start Importing
  const { data: { procedures } } = await client.query({
    query: getProcedures,
    variables: { IDs: procedureIds },
    fetchPolicy: 'network-only',
  });
  // Start Inserting
  const promises = await procedures.map(async (bIoProcedure) => {
    const newBIoProcedure = { ...bIoProcedure };
    if (bIoProcedure && bIoProcedure.history) {
      const [lastHistory] = newBIoProcedure.history.slice(-1);
      const btWithDecisions = bIoProcedure.history.filter(({ assignment, initiator }) => assignment === 'BT' && initiator === '2. Beratung');
      if (btWithDecisions.length > 0) {
        newBIoProcedure.voteDate = new Date(btWithDecisions.pop().date);
      } else if (newBIoProcedure.currentStatus === 'Zurückgezogen') {
        newBIoProcedure.voteDate = lastHistory.date;
      }
      let voteResults = false;
      procedures.history.forEach((h) => {
        if (h.decision) {
          return h.decision.forEach((decision) => {
            if (decision.type === 'Namentliche Abstimmung') {
              return (voteResults = {
                yes: decision.comment,
                no: decision.comment,
                abstination: decision.comment,
              });
            }
          });
        }
      });

      newBIoProcedure.lastUpdateDate = lastHistory.date;

      newBIoProcedure.submissionDate = newBIoProcedure.history[0].date;
    }
    return Procedure.findOneAndUpdate(
      { procedureId: newBIoProcedure.procedureId },
      newBIoProcedure,
      {
        upsert: true,
      },
    );
  });
  const result = await Promise.all(promises);

  return result.length;
  // Imported everything!
};
