/**
 * /webhooks/bundestagio/updateProcedures
 */

import importProcedures from '../../../scripts/import';

export default async (req, res) => {
  Log.info('Bundestag.io authenticated: Update Procedures');
  try {
    const {
      data: { procedureIds, name },
    } = req.body;
    const updated = await importProcedures(procedureIds);
    Log.info(`Updated ${name}: ${updated}`);
    res.send({
      updated,
      succeeded: true,
    });
  } catch (error) {
    Log.error(JSON.stringify({ error }));
    res.send({
      error,
      succeeded: false,
    });
  }
};
