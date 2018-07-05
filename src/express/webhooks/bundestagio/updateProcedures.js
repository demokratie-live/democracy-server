/**
 * /webhooks/bundestagio/updateProcedures
 */

import importProcedures from '../../../scripts/import';

export default async (req, res) => {
  const { data: { procedureIds, name } } = req.body;

  const updated = await importProcedures(procedureIds);
  console.log(`Updated ${name}: ${updated}`, { procedureIds });

  return res.send({
    updated,
    succeeded: true,
  });
};
