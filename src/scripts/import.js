import _ from 'lodash';

import createClient from '../graphql/client';
import Procedure from '../models/Procedure';
import getProcedures from '../graphql/queries/getProcedures';

const deputiesNumber = {
  8: 518,
  9: 519,
  10: 520,
  11: 663,
  12: 662,
  13: 672,
  14: 665,
  15: 601,
  16: 611,
  17: 620,
  18: 630,
  19: 709,
};

export default async (procedureIds) => {
  const client = createClient();
  // Start Importing
  const { data: { procedures } } = await client.query({
    query: getProcedures,
    variables: { IDs: procedureIds },
    fetchPolicy: 'network-only',
  });
  // Start Inserting
  const promises = await procedures.map(async (bIoProcedure) => {
    const newBIoProcedure = { ...bIoProcedure };
    if (bIoProcedure && bIoProcedure.history) {
      const [lastHistory] = newBIoProcedure.history.slice(-1);
      const btWithDecisions = bIoProcedure.history.filter(({ assignment, initiator }) => assignment === 'BT' && initiator === '2. Beratung');
      if (btWithDecisions.length > 0) {
        newBIoProcedure.voteDate = new Date(btWithDecisions.pop().date);
      } else if (newBIoProcedure.currentStatus === 'Zurückgezogen') {
        newBIoProcedure.voteDate = lastHistory.date;
      }
      let voteResults;
      bIoProcedure.history.some((h) => {
        if (h.decision) {
          return h.decision.some((decision) => {
            if (decision.type === 'Namentliche Abstimmung') {
              const vResults = decision.comment.split(':');
              voteResults = {
                yes: vResults[0],
                no: vResults[1],
                abstination: vResults[2],
                notVote:
                  deputiesNumber[bIoProcedure.period] -
                  vResults.reduce((pv, cv) => pv + parseInt(cv, 10), 0),
              };
              return true;
            }
            return false;
          });
        }
        return false;
      });
      newBIoProcedure.voteResults = voteResults;

      newBIoProcedure.lastUpdateDate = lastHistory.date;

      newBIoProcedure.submissionDate = newBIoProcedure.history[0].date;
    }
    return Procedure.findOneAndUpdate(
      { procedureId: newBIoProcedure.procedureId },
      _(newBIoProcedure)
        .omitBy(x => _.isNull(x) || _.isUndefined(x))
        .value(),
      {
        upsert: true,
      },
    );
  });
  const result = await Promise.all(promises);

  return result.length;
  // Imported everything!
};
