import ProgressBar from 'cli-progress'; // eslint-disable-line
import program from 'commander'; // eslint-disable-line

import client from '../src/graphql/client';

import mongoose from '../src/config/db';
import Procedure from '../src/models/Procedure';

import getProcedures from '../src/graphql/queries/getProcedures';

(async () => {
  const { data: { procedures } } = await client.query({ query: getProcedures });

  procedures.forEach(async (bIoProcedure) => {
    //
    // console.log(bIoProcedure);
    await Procedure.findOneAndUpdate({ procedureId: bIoProcedure.procedureId }, bIoProcedure, {
      upsert: true,
    });
  });
  await mongoose.disconnect();
  // bIoDb.disconnect();
})();
