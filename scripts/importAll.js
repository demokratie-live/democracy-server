import ProgressBar from 'cli-progress'; // eslint-disable-line
import program from 'commander'; // eslint-disable-line

import client from '../src/graphql/client';
import Procedure from '../src/models/Procedure';
import getAllProcedures from '../src/graphql/queries/getAllProcedures';

require('../src/config/db');

const PAGE_SIZE = 20;

(async () => {
  console.log('Start Importing');
  const { data: { allprocedures } } = await client.query({
    query: getAllProcedures,
    variables: { pageSize: PAGE_SIZE },
  });
  console.log(allprocedures);
  console.log('Start Inserting');
  await allprocedures.forEach(async (bIoProcedure) => {
    //
    const newBIoProcedure = { ...bIoProcedure };
    if (bIoProcedure && bIoProcedure.history) {
      const btWithDecisions = bIoProcedure.history.filter(({ assignment, decision }) => assignment === 'BT' && decision);
      if (btWithDecisions.length > 0) {
        newBIoProcedure.voteDate = new Date(btWithDecisions.pop().date);
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
