// GraphQL
import createClient from '../graphql/client';
import getProcedureUpdates from '../graphql/queries/getProcedureUpdates';
import { getCron, setCronError, setCronSuccess } from '../services/cronJobs/tools';
import importProcedures from '../scripts/importProcedure';

export default async () => {
  Log.info('Start Importing Procedures');
  const name = 'importProcedures';
  const cron = await getCron({ name });
  // Last SuccessStartDate
  const since = new Date(cron.lastSuccessStartDate);
  // New SuccessStartDate
  const startDate = new Date();

  // Query Bundestag.io
  try {
    const client = createClient();
    const limit = 25;
    let offset = 0;
    const associated = true;
    let done = false;
    while (!done) {
      // fetch
      const {
        data: {
          procedureUpdates: { procedures },
        },
      } =
        // eslint-disable-next-line no-await-in-loop
        await client.query({
          query: getProcedureUpdates,
          variables: { since, limit, offset, associated },
        });

      // handle results
      procedures.map(data => {
        if (data.period === 19 && (data.type === 'Gesetzgebung' || data.type === 'Antrag')) {
          importProcedures(data, { push: true });
        }
        return null;
      });

      // continue?
      if (procedures.length < limit) {
        done = true;
      }
      offset += limit;
    }
    // Update Cron - Success
    await setCronSuccess({ name, successStartDate: startDate });
  } catch (error) {
    // If address is not reachable the query will throw
    // Update Cron - Error
    await setCronError({ name });
    Log.error('try catch');
    Log.error(error);
  }

  Log.info('Finish Importing Procedures');
};
