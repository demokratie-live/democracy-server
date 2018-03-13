import ProgressBar from 'cli-progress'; // eslint-disable-line
import program from 'commander'; // eslint-disable-line

import client from '../src/graphql/client';
import Procedure from '../src/models/Procedure';
import getAllProcedures from '../src/graphql/queries/getAllProcedures';

require('../src/config/db');

(async () => {
  console.log('Start Importing');
  const { data: { allProcedures } } = await client.query({
    query: getAllProcedures,
    // variables: {},
  });
  console.log(allProcedures.map(({ procedureId }) => procedureId));
  console.log('Start Inserting');
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
})();
