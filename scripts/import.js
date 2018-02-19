import ProgressBar from 'cli-progress'; // eslint-disable-line
import program from 'commander'; // eslint-disable-line

import client from '../src/graphql/client';
import Procedure from '../src/models/Procedure';
import getProcedures from '../src/graphql/queries/getProcedures';

require('../src/config/db');

const PAGE_SIZE = 20;
const IDS = ['231766', '231534', '231097'];

(async () => {
  // Start Importing
  const { data: { procedures } } = await client.query({
    query: getProcedures,
    variables: { pageSize: PAGE_SIZE, IDs: IDS },
  });
  // Start Inserting
  await procedures.forEach(async (bIoProcedure) => {
    // console.log(bIoProcedure);
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
  // Imported everything!
})();
