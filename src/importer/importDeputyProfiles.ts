import createClient from '../graphql/client';
import getDeputyUpdates from '../graphql/queries/getDeputyUpdates';
import DeputyModel from '../models/Deputy';
import { convertPartyName } from './tools';
import { getCron, setCronStart, setCronSuccess, setCronError } from '../services/cronJobs/tools';
import {
  DeputyUpdates,
  DeputyUpdatesVariables,
} from '../graphql/queries/__generated__/DeputyUpdates';
import { nullToUndefined } from './importProcedures';

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
  let since = new Date();
  if (cron.lastSuccessStartDate) {
    since = new Date(cron.lastSuccessStartDate);
  }

  // Query Bundestag.io
  try {
    const client = createClient();
    const limit = 50;
    let offset = 0;
    let done = false;
    while (!done) {
      // fetch
      const {
        data: { deputyUpdates },
      } =
        // eslint-disable-next-line no-await-in-loop
        await client.query<DeputyUpdates, DeputyUpdatesVariables>({
          query: getDeputyUpdates,
          variables: { since, limit, offset },
        });
      if (deputyUpdates) {
        const { deputies } = deputyUpdates;
        if (deputies) {
          // handle results
          deputies.map(async data => {
            if (data) {
              const deputy = {
                webId: data.webId,
                imgURL: data.imgURL,
                name: data.name,
                party: data.party ? convertPartyName(data.party) : undefined,
                job: data.job,
                biography: data.biography ? data.biography.join('\n\n') : undefined,
                constituency: data.constituency
                  ? parseInt(data.constituency, 10).toString()
                  : undefined, // remove pre zeros
                directCandidate: data.directCandidate,
                contact: {
                  address: data.office ? data.office.join('\n') : undefined,
                  // email: { type: String },
                  links: data.links,
                },
              };
              // Update/Insert
              await DeputyModel.findOneAndUpdate(
                { webId: nullToUndefined(deputy.webId) },
                { $set: deputy },
                { upsert: true },
              );
            }
            return null;
          });

          // continue?
          if (deputies.length < limit) {
            done = true;
          }
        }
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
