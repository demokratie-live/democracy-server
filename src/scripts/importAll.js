import createClient from '../graphql/client';

import getAllProcedures from '../graphql/queries/getAllProcedures';

import importProcedure from './importProcedure';

export default async (req, res) => {
  const client = createClient();
  Log.import('Start Importing');
  const { data: { allProcedures } } = await client.query({
    query: getAllProcedures,
    // variables: {},
  });
  Log.import(JSON.stringify(allProcedures.map(({ procedureId }) => procedureId)));
  Log.import('Start Inserting');
  // Start Inserting
  await allProcedures.forEach(importProcedure);
  Log.import("Imported everything!"); // eslint-disable-line
  res.send('Imported everything!');
};
