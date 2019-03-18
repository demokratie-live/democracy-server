import createClient from '../graphql/client';
import getDeputyUpdates from '../graphql/queries/getDeputyUpdates';
import DeputyModel from '../models/Deputy';
import { convertPartyName } from './tools';
import { getCron, setCronSuccess, setCronError } from '../services/cronJobs/tools';

export default async () => {
  Log.import('Start Importing Deputy Profiles');
  const name = 'importDeputyProfiles';
  const cron = await getCron({ name });
  // Last SuccessStartDate
  const since = new Date(cron.lastSuccessStartDate);
  // New SuccessStartDate
  const startDate = new Date();

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
        await client.query({
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
    await setCronSuccess({ name, successStartDate: startDate });
  } catch (error) {
    // If address is not reachable the query will throw
    // Update Cron - Error
    await setCronError({ name });
    Log.error(error);
  }
  Log.import('Finish Importing Deputy Profiles');
};
