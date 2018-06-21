import importProcedures from './import';
import getProcedureUpdates from '../graphql/queries/getProcedureUpdates';
import createClient from '../graphql/client';
import ProcedureModel from '../models/Procedure';
import CONSTANTS from '../config/constants';

export default async (data) => {
  const client = createClient();

  const NOW = new Date();
  const ONEDAY = 24 * 60 * 60 * 1000;
  let update = [];
  await Promise.all(data.map(async (d) => {
    const period = parseInt(d.period, 10);
    const types = d.types.filter(t => t.type === 'Gesetzgebung' || t.type === 'Antrag');
    if (CONSTANTS.MIN_PERIOD <= period) {
      await Promise.all(types.map(async (t) => {
        const { type, changedIds } = t;
        // Append Changed IDs
        update = update.concat(changedIds);
        // Find remote Procedure Updates
        const { data: { procedureUpdates } } = await client.query({
          query: getProcedureUpdates,
          variables: { period, type },
        });
        // Find local Procedure Updates
        const localProcedureUpdates = await ProcedureModel.find(
          { period, type },
          { procedureId: 1, bioUpdateAt: 1, updatedAt: 1 },
        );
        // Compare
        procedureUpdates.forEach((pu) => {
          const localData = localProcedureUpdates.find(ld => ld.procedureId === pu.procedureId);
          if (
          // local data not present
            !localData ||
                // older than a day TODO: make it a week?
                NOW - new Date(localData.updatedAt) > ONEDAY ||
                // bio date is newer
                (pu.bioUpdateAt &&
                  new Date(localData.bioUpdateAt).getTime() !== new Date(pu.bioUpdateAt).getTime())
          ) {
            update.push(pu.procedureId);
          }
        });
      }));
    }
  }));

  // Splitt in Chunks & Update
  const chunkSize = 100;
  let updateCount = 0;
  let i = 0;
  for (i = 0; i < update.length; i += chunkSize) {
    const part = update.slice(i, i + chunkSize);
    updateCount += await importProcedures(part); // eslint-disable-line no-await-in-loop
  }

  return updateCount;
};
