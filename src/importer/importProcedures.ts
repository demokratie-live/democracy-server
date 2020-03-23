import _ from 'lodash';
import moment from 'moment';

// Definitions
import { PROCEDURE as PROCEDURE_DEFINITIONS } from '@democracy-deutschland/bundestag.io-definitions';

// GraphQL
import createClient from '../graphql/client';
import getProcedureUpdates from '../graphql/queries/getProcedureUpdates';
import { getCron, setCronStart, setCronSuccess, setCronError } from '../services/cronJobs/tools';

// Models
import Procedure from '../models/Procedure';

// Queries
import { quePushsOutcome } from '../services/notifications';
import { convertPartyName } from './tools';
import { ProcedureDoc } from '../migrations/11-schemas/Procedure';
import { VoteSelection } from '../generated/graphql';
import {
  ProcedureUpdates,
  ProcedureUpdatesVariables,
  ProcedureUpdates_procedureUpdates_procedures,
} from '../graphql/queries/__generated__/ProcedureUpdates';
import { VoteDecision } from '../../__generated__/globalTypes';

export const CRON_NAME = 'Procedures';

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

const importProcedures = async (
  bIoProcedure: ProcedureUpdates_procedureUpdates_procedures,
  { push = false },
) => {
  const importProcedure: Partial<ProcedureDoc> = {
    ...bIoProcedure,
    importantDocuments: undefined,
  };
  if (bIoProcedure && bIoProcedure.history) {
    const [lastHistory] = bIoProcedure.history.slice(-1);
    importProcedure.lastUpdateDate = lastHistory.date; // eslint-disable-line no-param-reassign
    importProcedure.submissionDate = bIoProcedure.history[0].date; // eslint-disable-line no-param-reassign
  }

  // check vote results
  let voteResults: ProcedureDoc['voteResults'] = {
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
        ({ party, main, ...rest }) => {
          let mainValue: VoteSelection;
          switch (main) {
            case VoteDecision.ABSTINATION:
              mainValue = VoteSelection.Abstination;
              break;
            case VoteDecision.NO:
              mainValue = VoteSelection.No;
              break;
            case VoteDecision.YES:
              mainValue = VoteSelection.Yes;
              break;
            case VoteDecision.ABSTINATION:
              mainValue = VoteSelection.Abstination;
              break;
            case VoteDecision.NOTVOTED:
              mainValue = VoteSelection.Notvoted;
              break;
            default:
              mainValue = main;
          }
          return {
            ...rest,
            _id: false,
            party: convertPartyName(party),
            main: mainValue,
          };
        },
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
              mainDecision = main === VoteSelection.Yes ? VoteSelection.No : VoteSelection.Yes;
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
  importProcedure.voteResults = voteResults; // eslint-disable-line no-param-reassign

  // Extract Session info
  if (bIoProcedure.sessions) {
    // This assumes that the last entry will always be the vote
    const lastSession = bIoProcedure.sessions.pop();
    if (lastSession && lastSession.session.top.topic.isVote) {
      importProcedure.voteWeek = lastSession.thisWeek; // eslint-disable-line no-param-reassign
      importProcedure.voteYear = lastSession.thisYear; // eslint-disable-line no-param-reassign
      importProcedure.sessionTOPHeading = lastSession.session.top.heading; // eslint-disable-line no-param-reassign
    }
  }
  // Set CalendarWeek & Year even if no sessions where found
  // Always override Week & Year by voteDate since we sort by this and the session match is not too accurate
  if (bIoProcedure.voteDate /* && (!bIoProcedure.voteWeek || !bIoProcedure.voteYear) */) {
    importProcedure.voteWeek = parseInt(moment(bIoProcedure.voteDate).format('W')); // eslint-disable-line no-param-reassign
    importProcedure.voteYear = moment(bIoProcedure.voteDate).year(); // eslint-disable-line no-param-reassign
  }

  const oldProcedure = await Procedure.findOne({
    procedureId: bIoProcedure.procedureId,
  });

  return Procedure.findOneAndUpdate(
    { procedureId: importProcedure.procedureId },
    _(importProcedure)
      .omitBy(x => _.isUndefined(x))
      .value(),
    {
      upsert: true,
      new: true,
    },
  ).then(() => {
    if (push) {
      // We have a vote result in new Procedure
      if (
        importProcedure.voteResults.yes !== null ||
        importProcedure.voteResults.no !== null ||
        importProcedure.voteResults.abstination !== null ||
        importProcedure.voteResults.notVoted !== null
      ) {
        // We have no old Procedure or no VoteResult on old Procedure
        if (!oldProcedure || !oldProcedure.voteResults) {
          quePushsOutcome(importProcedure.procedureId);
          // We have different values for VoteResult
        } else if (
          importProcedure.voteResults.yes !== oldProcedure.voteResults.yes ||
          importProcedure.voteResults.no !== oldProcedure.voteResults.no ||
          importProcedure.voteResults.abstination !== oldProcedure.voteResults.abstination ||
          importProcedure.voteResults.notVoted !== oldProcedure.voteResults.notVoted
        ) {
          quePushsOutcome(importProcedure.procedureId);
        }
      }
    }
  });
};

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
          procedureUpdates: { procedures },
        },
      } =
        // eslint-disable-next-line no-await-in-loop
        await client.query<ProcedureUpdates, ProcedureUpdatesVariables>({
          query: getProcedureUpdates,
          variables: { since, limit, offset },
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
    await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
  } catch (error) {
    // If address is not reachable the query will throw
    await setCronError({ name: CRON_NAME, error: JSON.stringify(error) });
  }
};
