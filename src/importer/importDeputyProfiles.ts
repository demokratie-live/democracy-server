import createClient from '../graphql/client';
import getDeputyUpdates from '../graphql/queries/getDeputyUpdates';
import DeputyModel from '../models/Deputy';
import { convertPartyName } from './tools';
import { getCron, setCronStart, setCronSuccess, setCronError } from '../services/cronJobs/tools';
import {
  DeputyUpdates,
  DeputyUpdatesVariables,
} from '../graphql/queries/__generated__/DeputyUpdates';

export const CRON_NAME = 'DeputyProfiles';

export default async () => {
  // New SuccessStartDate
  const startDate = new Date();
  const cron = await getCron({ name: CRON_NAME });
  if (cron.running) {
    global.Log.error(`[Cronjob][${CRON_NAME}] running still - skipping`);
    return;
  }
  await setCronStart({ name: CRON_NAME, startDate });
  // Last SuccessStartDate
  const since = new Date(cron.lastSuccessStartDate);

  // Query Bundestag.io
  try {
    const client = createClient();
    const limit = 50;
    let offset = 0;
    let done = false;
    while (!done) {
      // fetch
      const {
        data: {
          deputyUpdates: { deputies },
        },
      } =
        // eslint-disable-next-line no-await-in-loop
        await client.query<DeputyUpdates, DeputyUpdatesVariables>({
          query: getDeputyUpdates,
          variables: { since, limit, offset },
        });

      // handle results
      deputies.map(async data => {
        const deputy = {
          webId: data.webId,
          imgURL: data.imgURL,
          name: data.name,
          party: convertPartyName(data.party),
          job: data.job,
          biography: data.biography.join('\n\n'),
          constituency: data.constituency ? parseInt(data.constituency, 10).toString() : undefined, // remove pre zeros
          directCandidate: data.directCandidate,
          contact: {
            address: data.office.join('\n'),
            // email: { type: String },
            links: data.links,
          },
        };
        // Update/Insert
        await DeputyModel.findOneAndUpdate(
          { webId: deputy.webId },
          { $set: deputy },
          { upsert: true },
        );
        return null;
      });

      // continue?
      if (deputies.length < limit) {
        done = true;
      }
      offset += limit;
    }
    // Update Cron - Success
    await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
  } catch (error) {
    // If address is not reachable the query will throw
    await setCronError({ name: CRON_NAME, error: JSON.stringify(error) });
  }
};
