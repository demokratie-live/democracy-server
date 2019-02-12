import _ from 'lodash';

import createClient from '../graphql/client';
import getDeputyUpdates from '../graphql/queries/getDeputyUpdates';
import DeputyModel from '../models/Deputy';

export default async () => {
  Log.import('Start Importing Deputy Profiles');

  // TODO
  const since = new Date('2019-01-16T09:59:20.123Z');

  // Query Bundestag.io
  const client = createClient();
  const limit = 50;
  let offset = 0;
  let done = false;

  try {
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
          party: data.party,
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
        await DeputyModel.update(
          { webId: deputy.webId },
          { $set: _.pickBy(deputy) },
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
  } catch (error) {
    // If address is not reachable the query will throw
    Log.error(error);
  }
};
