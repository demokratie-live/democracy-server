import createClient from '../graphql/client';

import getAllProcedures from '../graphql/queries/getAllProcedures';

import importProcedure from './importProcedure';

export default async (req, res) => {
  const client = createClient();
  console.log('Start Importing');
  const { data: { allProcedures } } = await client.query({
    query: getAllProcedures,
    // variables: {},
  });
  console.log(allProcedures.map(({ procedureId }) => procedureId));
  console.log('Start Inserting');
  // Start Inserting
  await allProcedures.forEach(importProcedure);
  console.log('Imported everything!'); // eslint-disable-line
  res.send('Imported everything!');
};
