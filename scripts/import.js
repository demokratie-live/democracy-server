import ProgressBar from 'cli-progress'; // eslint-disable-line
import program from 'commander'; // eslint-disable-line

import client from '../src/graphql/client';
import Procedure from '../src/models/Procedure';
import getProcedures from '../src/graphql/queries/getProcedures';

require('../src/config/db');

(async () => {
  const { data: { procedures } } = await client.query({ query: getProcedures });

  procedures.forEach(async (bIoProcedure) => {
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
})();
