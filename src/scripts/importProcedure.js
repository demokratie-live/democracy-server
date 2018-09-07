import _ from 'lodash';
import { detailedDiff } from 'deep-object-diff';

// Models
import Procedure from '../models/Procedure';
import PushNotifiaction from '../models/PushNotifiaction';

// Queries
import { procedureUpdate } from '../services/notifications/index';

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

export default async (bIoProcedure, { push = false }) => {
  const newBIoProcedure = { ...bIoProcedure };
  if (bIoProcedure && bIoProcedure.history) {
    const [lastHistory] = newBIoProcedure.history.slice(-1);
    // Conditions on which Procedure is voted upon
    const btWithDecisions = bIoProcedure.history.filter(
      ({ initiator, decision }) =>
        // Beschluss liegt vor
        // TODO: decision should not be an array
        (decision &&
          decision.find(
            ({ tenor }) =>
              tenor === 'Ablehnung der Vorlage' ||
              tenor === 'Annahme der Vorlage' ||
              tenor === 'Erklärung der Vorlage für erledigt' ||
              tenor === 'Annahme in Ausschussfassung',
          )) ||
        // Zurückgezogen
        initiator === 'Amtliche Mitteilung: Rücknahme' ||
        initiator === 'Rücknahme',
    );
    if (btWithDecisions.length > 0) {
      newBIoProcedure.voteDate = new Date(btWithDecisions.pop().date);
    } else if (bIoProcedure.customData && bIoProcedure.customData.expectedVotingDate) {
      newBIoProcedure.voteDate = new Date(bIoProcedure.customData.expectedVotingDate);
    }

    // check vote results
    let voteResults = {
      yes: null,
      no: null,
      abstination: null,
      notVoted: null,
    };
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
        notVoted: bIoProcedure.customData.voteResults.notVoted,
        decisionText: bIoProcedure.customData.voteResults.decisionText,
        namedVote: bIoProcedure.namedVote,
        partyVotes: bIoProcedure.customData.voteResults.partyVotes,
      };

      // toggle votingData (Yes & No) if needed
      if (
        bIoProcedure.customData.voteResults.votingDocument === 'recommendedDecision' &&
        bIoProcedure.customData.voteResults.votingRecommendation === false
      ) {
        voteResults = {
          ...voteResults,
          yes: voteResults.no,
          no: voteResults.yes,
          partyVotes: voteResults.partyVotes.map(({ main, deviants, ...rest }) => {
            let mainDecision = main;
            if (main !== 'ABSTINATION') {
              mainDecision = main === 'YES' ? 'NO' : 'YES';
            }
            return {
              ...rest,
              main: mainDecision,
              deviants: {
                ...deviants,
                yes: deviants.no,
                no: deviants.yes,
              },
            };
          }),
        };
      }
    } else {
      // TODO: check if is needed after adding named-poll-scraper!
      bIoProcedure.history.some(h => {
        if (h.decision) {
          return h.decision.some(decision => {
            if (decision.type === 'Namentliche Abstimmung') {
              const voteResultsRegEx = /(\d{1,3}:\d{1,3}:\d{1,3})/;
              const voteResultsProto = decision.comment.match(voteResultsRegEx);
              const vResults = voteResultsProto ? voteResultsProto[0].split(':') : null;
              voteResults = {
                yes: vResults ? vResults[0] : null,
                no: vResults ? vResults[1] : null,
                abstination: vResults ? vResults[2] : null,
                notVoted:
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

  const oldProcedure = await Procedure.findOne({
    procedureId: newBIoProcedure.procedureId,
  });

  return Procedure.findOneAndUpdate(
    { procedureId: newBIoProcedure.procedureId },
    _(newBIoProcedure)
      .omitBy(x => _.isNull(x) || _.isUndefined(x))
      .value(),
    {
      upsert: true,
      new: true,
    },
  ).then(newDoc => {
    if (push) {
      /**
       * PUSH NOTIFICATIONS
       */
      // New Procedures
      if (!oldProcedure) {
        Log.push(
          JSON.stringify({
            type: 'new Procedure',
            ids: newBIoProcedure.procedureId,
          }),
        );
        PushNotifiaction.create({
          procedureId: newBIoProcedure.procedureId,
          type: 'new',
        });
        // newPreperation({ procedureId: newBIoProcedure.procedureId });
      } else {
        // Updated Procedures
        const diffs = detailedDiff(newDoc.toObject(), oldProcedure.toObject());
        const updatedValues = _.compact(
          _.map(diffs.updated, (value, key) => {
            switch (key) {
              case 'currentStatus':
              case 'importantDocuments':
              case 'voteResults':
                return key;

              case 'updatedAt':
              case 'bioUpdateAt':
                return null;

              default:
                return null;
            }
          }),
        );
        if (updatedValues.length > 0) {
          Log.import(
            JSON.stringify({
              type: 'updated Procedure',
              ids: newBIoProcedure.procedureId,
              diffs,
            }),
          );
          PushNotifiaction.create({
            procedureId: newBIoProcedure.procedureId,
            type: 'update',
            updatedValues,
          });
          procedureUpdate({ procedureId: newBIoProcedure.procedureId });
        }
        if (
          (newBIoProcedure.currentStatus === 'Beschlussempfehlung liegt vor' &&
            oldProcedure.currentStatus !== 'Beschlussempfehlung liegt vor' &&
            !(
              oldProcedure.currentStatus === 'Überwiesen' && newBIoProcedure.voteDate > new Date()
            )) ||
          (newBIoProcedure.currentStatus === 'Überwiesen' &&
            newBIoProcedure.voteDate > new Date() &&
            !oldProcedure.voteDate)
        ) {
          // moved to Vote Procedures
          Log.import(
            JSON.stringify({
              type: 'new Vote',
              ids: newBIoProcedure.procedureId,
            }),
          );
          PushNotifiaction.create({
            procedureId: newBIoProcedure.procedureId,
            type: 'newVote',
          });
          // newVote({ procedureId: newBIoProcedure.procedureId });
        }
      }
    }
  });
};
