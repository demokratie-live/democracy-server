import createClient from '../graphql/client';

import getProcedures from '../graphql/queries/getProcedures';

import importProcedure from './importProcedure';

export default async procedureIds => {
  const client = createClient();
  // Start Importing
  const {
    data: { procedures },
  } = await client.query({
    query: getProcedures,
    variables: { IDs: procedureIds },
  });
  // Start Inserting
  const promises = procedures.map(procedure => importProcedure(procedure, { push: true }));
  const result = await Promise.all(promises);

  return result.length;
  // Imported everything!
};
