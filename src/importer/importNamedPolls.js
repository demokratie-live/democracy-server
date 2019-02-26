import { unionBy } from 'lodash';

// GraphQL
import createClient from '../graphql/client';
import getNamedPollUpdates from '../graphql/queries/getNamedPollUpdates';
import DeputyModel from '../models/Deputy';
import { getCron, setCronError, setCronSuccess } from '../services/cronJobs/tools';

export default async () => {
  Log.import('Start Importing Named Polls');
  const name = 'importNamedPolls';
  const cron = await getCron({ name });
  // Last SuccessStartDate
  const since = new Date(cron.lastSuccessStartDate); // new Date('2019-01-16T09:59:20.123Z');
  // New SuccessStartDate
  const startDate = new Date();

  // Query Bundestag.io
  try {
    const client = createClient();
    const limit = 50;
    let offset = 0;
    const associated = true;
    let done = false;
    while (!done) {
      // Data storage
      const updates = {};

      // fetch
      const {
        data: {
          namedPollUpdates: { namedPolls },
        },
      } =
        // eslint-disable-next-line no-await-in-loop
        await client.query({
          query: getNamedPollUpdates,
          variables: { since, limit, offset, associated },
        });

      // handle results
      namedPolls.map(data => {
        // procedureId is not necessarily present
        if (data.procedureId) {
          // parse every deputies vote
          data.votes.deputies.map(async voteData => {
            let decision;
            switch (voteData.vote) {
              case 'ja':
                decision = data.votes.inverseVoteDirection ? 'NO' : 'YES';
                break;
              case 'nein':
                decision = data.votes.inverseVoteDirection ? 'YES' : 'NO';
                break;
              case 'na':
                decision = 'NOTVOTED';
                break;
              case 'enthalten':
                decision = 'ABSTINATION';
                break;
              default:
                decision = null;
            }
            // Validate decision Data
            if (!decision) {
              Log.error(`NamedPoll import vote missmatch on deputy vote string: ${voteData.vote}`);
              return null;
            }
            // Prepare update
            if (voteData.webId) {
              updates[voteData.webId] = updates[voteData.webId]
                ? [...updates[voteData.webId], { procedureId: data.procedureId, decision }]
                : [{ procedureId: data.procedureId, decision }];
            }
            return null;
          });
        }
        return null;
      });

      // Insert Data
      Object.keys(updates).map(async deputyWebId => {
        // TODO try to update deputy without fetching. z.B. with aggregation setUnion
        const deputy = await DeputyModel.findOne({ webId: deputyWebId });
        if (deputy) {
          // remove duplicates
          const votes = unionBy(updates[deputyWebId], deputy.votes, 'procedureId');

          await DeputyModel.updateOne({ webId: deputyWebId }, { $set: { votes } });
        }
      });

      // continue?
      if (namedPolls.length < limit) {
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

  Log.import('Finish Importing Named Polls');
};
