import _ from 'lodash';

import createClient from '../graphql/client';
import Procedure from '../models/Procedure';
import getProcedures from '../graphql/queries/getProcedures';

import { procedureUpdate, newPreperation, newVote } from '../services/notifications/index';

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
      // Conditions on which Procedure is voted upon
      const btWithDecisions = bIoProcedure.history.filter(({ initiator, decision }) =>
        // Beschluss liegt vor
        // TODO: decision should not be an array
        (decision && (decision.find(({ tenor }) => tenor === 'Ablehnung der Vorlage' || tenor === 'Annahme der Vorlage'))) ||
        // Zurückgezogen
        initiator === 'Amtliche Mitteilung: Rücknahme');
      if (btWithDecisions.length > 0) {
        newBIoProcedure.voteDate = new Date(btWithDecisions.pop().date);
      }

      // check vote results
      let voteResults;
      if (
        bIoProcedure.customData &&
        bIoProcedure.customData.voteResults &&
        (bIoProcedure.customData.voteResults.yes ||
          bIoProcedure.customData.voteResults.abstination ||
          bIoProcedure.customData.voteResults.no)
      ) {
        voteResults = {
          yes: bIoProcedure.customData.voteResults.yes,
          abstination: bIoProcedure.customData.voteResults.abstination,
          no: bIoProcedure.customData.voteResults.no,
        };
      } else {
        bIoProcedure.history.some((h) => {
          if (h.decision) {
            return h.decision.some((decision) => {
              if (decision.type === 'Namentliche Abstimmung') {
                const voteResultsRegEx = /(\d{1,3}:\d{1,3}:\d{1,3})/;
                const voteResultsProto = decision.comment.match(voteResultsRegEx);
                const vResults = voteResultsProto ? voteResultsProto[0].split(':') : null;
                voteResults = {
                  yes: vResults ? vResults[0] : null,
                  no: vResults ? vResults[1] : null,
                  abstination: vResults ? vResults[2] : null,
                  notVote:
                    deputiesNumber[bIoProcedure.period] -
                    (vResults ? vResults.reduce((pv, cv) => pv + parseInt(cv, 10), 0) : 0),
                };
                return true;
              }
              return false;
            });
          }
          return false;
        });
      }
      newBIoProcedure.voteResults = voteResults;

      newBIoProcedure.lastUpdateDate = lastHistory.date;

      newBIoProcedure.submissionDate = newBIoProcedure.history[0].date;
    }

    const oldProcedure = await Procedure.find(
      { procedureId: newBIoProcedure.procedureId },
      { _id: 1 },
    ).limit(1);

    return Procedure.findOneAndUpdate(
      { procedureId: newBIoProcedure.procedureId },
      _(newBIoProcedure)
        .omitBy(x => _.isNull(x) || _.isUndefined(x))
        .value(),
      {
        upsert: true,
      },
    ).then(() => {
      /**
       * PUSH NOTIFICATIONS
       */
      // New Procedures
      if (!oldProcedure.length) {
        console.log('PUSH NOTIFICATIONS', 'new Procedure', newBIoProcedure.procedureId);
        newPreperation({ procedureId: newBIoProcedure.procedureId });
      } else {
        // Updated Procedures
        console.log('PUSH NOTIFICATIONS', 'updated Procedure', newBIoProcedure.procedureId);
        procedureUpdate({ procedureId: newBIoProcedure.procedureId });
        if (newBIoProcedure.currentStatus === 'Beschlussempfehlung liegt vor') {
          // moved to Vote Procedures
          console.log('PUSH NOTIFICATIONS', 'new Vote', newBIoProcedure.procedureId);
          newVote({ procedureId: newBIoProcedure.procedureId });
        }
      }
    });
  });

  const result = await Promise.all(promises);

  return result.length;
  // Imported everything!
};
