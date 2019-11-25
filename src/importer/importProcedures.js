import _ from 'lodash';

// GraphQL
import { detailedDiff } from 'deep-object-diff';
import createClient from '../graphql/client';
import getProcedureUpdates from '../graphql/queries/getProcedureUpdates';
import { getCron, setCronError, setCronSuccess } from '../services/cronJobs/tools';

// Definitions
import PROCEDURE_DEFINITIONS from '../definitions/procedure';

// Models
import Procedure from '../models/Procedure';
import PushNotifiaction from '../models/PushNotifiaction';

// Queries
import { procedureUpdate } from '../services/notifications';
import { convertPartyName } from '../importer/tools';

/* const deputiesNumber = {
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
}; */

const sendProcedurePushs = async (newBIoProcedure, newDoc, oldProcedure) => {
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
      (newBIoProcedure.currentStatus === PROCEDURE_DEFINITIONS.STATUS.BESCHLUSSEMPFEHLUNG &&
        oldProcedure.currentStatus !== PROCEDURE_DEFINITIONS.STATUS.BESCHLUSSEMPFEHLUNG &&
        !(
          oldProcedure.currentStatus === PROCEDURE_DEFINITIONS.STATUS.UEBERWIESEN &&
          newBIoProcedure.voteDate > new Date()
        )) ||
      (newBIoProcedure.currentStatus === PROCEDURE_DEFINITIONS.STATUS.UEBERWIESEN &&
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
};

const importProcedures = async (bIoProcedure, { push = false }) => {
  const newBIoProcedure = { ...bIoProcedure }; // Make sure to copy the object
  // TODO move this evaluation to BIO
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
              tenor === PROCEDURE_DEFINITIONS.HISTORY.DECISION.TENOR.VORLAGE_ABLEHNUNG ||
              tenor === PROCEDURE_DEFINITIONS.HISTORY.DECISION.TENOR.VORLAGE_ANNAHME ||
              tenor === PROCEDURE_DEFINITIONS.HISTORY.DECISION.TENOR.VORLAGE_ERLEDIGT ||
              tenor === PROCEDURE_DEFINITIONS.HISTORY.DECISION.TENOR.AUSSCHUSSFASSUNG_ANNAHME,
          )) ||
        // Zurückgezogen
        initiator === PROCEDURE_DEFINITIONS.HISTORY.INITIATOR.RUECKNAHME_AMTLICH ||
        initiator === PROCEDURE_DEFINITIONS.HISTORY.INITIATOR.RUECKNAHME ||
        initiator === PROCEDURE_DEFINITIONS.HISTORY.INITIATOR.RUECKNAHME_VORLAGE,
    );
    if (btWithDecisions.length > 0) {
      // Do not override the more accurate date form ConferenceWeekDetails Scraper
      const historyDate = new Date(btWithDecisions.pop().date);
      if (bIoProcedure.voteDate < historyDate) {
        newBIoProcedure.voteDate = historyDate;
      }
    } else {
      newBIoProcedure.voteDate = bIoProcedure.voteDate;
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
      };

      if (bIoProcedure.customData.voteResults.partyVotes) {
        voteResults.partyVotes = bIoProcedure.customData.voteResults.partyVotes.map(
          ({ party, ...rest }) => ({
            ...rest,
            party: convertPartyName(party),
          }),
        );

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
      }
    }

    newBIoProcedure.voteResults = voteResults;

    newBIoProcedure.lastUpdateDate = lastHistory.date;

    newBIoProcedure.submissionDate = newBIoProcedure.history[0].date;
  }

  // Etract Session info
  if (bIoProcedure && bIoProcedure.sessions) {
    // This assumes that the last entry will always be the vote
    const lastSession = bIoProcedure.sessions.pop();
    if (lastSession && lastSession.session.top.topic.isVote) {
      newBIoProcedure.voteWeek = lastSession.thisWeek;
      newBIoProcedure.voteYear = lastSession.thisYear;
      newBIoProcedure.sessionTOPHeading = lastSession.session.top.heading;
    }
  }

  const oldProcedure = await Procedure.findOne({
    procedureId: newBIoProcedure.procedureId,
  });

  return Procedure.findOneAndUpdate(
    { procedureId: newBIoProcedure.procedureId },
    _(newBIoProcedure)
      .omitBy(x => _.isUndefined(x))
      .value(),
    {
      upsert: true,
      new: true,
    },
  ).then(newDoc => {
    if (push) {
      sendProcedurePushs(newBIoProcedure, newDoc, oldProcedure);
    }
  });
};

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
        if (
          data.period === 19 &&
          (data.type === PROCEDURE_DEFINITIONS.TYPE.GESETZGEBUNG ||
            data.type === PROCEDURE_DEFINITIONS.TYPE.ANTRAG)
        ) {
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
    Log.error(error);
  }

  Log.info('Finish Importing Procedures');
};
