/**
 * /webhooks/bundestagio/updateProcedures
 */

import importProcedures from '../../../scripts/import';

export default async (req, res) => {
  const { procedureIds } = req.body;

  const updated = await importProcedures(procedureIds);
  console.log(`Updated Agenda: ${updated}`);

  return res.send({
    updated,
    succeeded: true,
  });
};
