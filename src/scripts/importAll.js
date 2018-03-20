import createClient from '../graphql/client';
import Procedure from '../models/Procedure';
import getAllProcedures from '../graphql/queries/getAllProcedures';

export default async () => {
  const client = createClient();
  console.log('Start Importing');
  const { data: { allProcedures } } = await client.query({
    query: getAllProcedures,
    // variables: {},
  });
  console.log(allProcedures.map(({ procedureId }) => procedureId));
  console.log('Start Inserting');
  // Start Inserting
  await allProcedures.forEach(async (bIoProcedure) => {
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
      bIoProcedure.history.some((h) => {
        if (h.decision) {
          return h.decision.some((decision) => {
            if (decision.type === 'Namentliche Abstimmung') {
              const vResults = decision.comment.split(':');
              voteResults = {
                yes: vResults[0],
                no: vResults[1],
                abstination: vResults[2],
              };
              return true;
            }
            return false;
          });
        }
        return false;
      });
      console.log(newBIoProcedure.procedureId, voteResults);
      newBIoProcedure.voteResults = voteResults;

      newBIoProcedure.lastUpdateDate = lastHistory.date;

      newBIoProcedure.submissionDate = newBIoProcedure.history[0].date;
    }
    await Procedure.findOneAndUpdate(
      { procedureId: newBIoProcedure.procedureId },
      newBIoProcedure,
      {
        upsert: true,
      },
    );
  });
  console.log('Imported everything!'); // eslint-disable-line
};
