import ProgressBar from 'cli-progress'; // eslint-disable-line
import program from 'commander'; // eslint-disable-line

import client from '../src/graphql/client';
import Procedure from '../src/models/Procedure';
import getAllProcedures from '../src/graphql/queries/getAllProcedures';

require('../src/config/db');

const PAGE_SIZE = 20;

(async () => {
  console.log('Start Importing');
  const { data: { allProcedures } } = await client.query({
    query: getAllProcedures,
    variables: { pageSize: PAGE_SIZE },
  });
  console.log(allProcedures.map(({ procedureId }) => procedureId));
  console.log('Start Inserting');
  await allProcedures.forEach(async (bIoProcedure) => {
    const newBIoProcedure = { ...bIoProcedure };
    if (bIoProcedure && bIoProcedure.history) {
      const btWithDecisions = bIoProcedure.history.filter(({ assignment, decision }) => assignment === 'BT' && decision);
      if (btWithDecisions.length > 0) {
        newBIoProcedure.voteDate = new Date(btWithDecisions.pop().date);
      } else if (newBIoProcedure.currentStatus === 'Zurückgezogen') {
        const [lastHistory] = newBIoProcedure.history.slice(-1);
        newBIoProcedure.voteDate = lastHistory.date;
      } else {
        const [lastHistory] = newBIoProcedure.history.slice(-1);
        newBIoProcedure.voteDate = lastHistory.date;
      }
    }
    await Procedure.findOneAndUpdate(
      { procedureId: newBIoProcedure.procedureId },
      newBIoProcedure,
      {
        upsert: true,
      },
    );
  });
  console.log('Imported everything!');
})();
