import importProcedures from './import';
import getProcedureUpdates from '../graphql/queries/getProcedureUpdates';
import createClient from '../graphql/client';
import ProcedureModel from '../models/Procedure';

export default async (data) => {
  const client = createClient();

  // Count local Data in groups
  const groups = await ProcedureModel.aggregate([
    {
      // Group by Period & Type
      $group: {
        _id: { period: '$period', type: '$type' },
        count: { $sum: 1 },
      },
    },
    {
      // Group by Period
      $group: {
        _id: '$_id.period',
        types: { $push: { type: '$_id.type', count: '$count' } },
      },
    },
    {
      // Rename _id Field to period
      $project: { _id: 0, period: '$_id', types: 1 },
    },
  ]);

  const update = [];
  await Promise.all(data.map(async (d) => {
    const period = parseInt(d.period, 10);
    const { type, countBefore, changedIds } = d.types.find(t => t.type === 'Gesetzgebung' || t.type === 'Antrag');
    const group = groups.find(c => c.period === period);
    const localGroup = group ? group.types.find(ct => ct.type === type) : null;
    const localCount = localGroup ? localGroup.count : 0;
    // Append Changed IDs
    update.concat(changedIds);
    // Compare Counts Remote & Local
    if (countBefore > localCount) {
      // Find remote Procedure Updates
      const { data: { procedureUpdates } } = await client.query({
        query: getProcedureUpdates,
        variables: { period, type },
      });
      // Find local Procedure Updates
      const localProcedureUpdates = await ProcedureModel.find(
        { period, type },
        { procedureId: 1, bioUpdateAt: 1 },
      );
      // Compare
      procedureUpdates.forEach((pu) => {
        const localData = localProcedureUpdates.find(ld => ld.procedureId === pu.procedureId);
        if (
          !localData ||
          (pu.bioUpdateAt &&
            new Date(localData.bioUpdateAt).getTime() !== new Date(pu.bioUpdateAt).getTime())
        ) {
          update.push(pu.procedureId);
        }
      });
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
