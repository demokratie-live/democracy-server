import { CronJob } from 'cron';

import CONFIG from '../../config';

import importDeputyProfiles, {
  CRON_NAME as CRON_NAME_DEPUTY_PROFILES,
} from '../../importer/importDeputyProfiles';
import importNamedPolls, {
  CRON_NAME as CRON_NAME_NAMED_POLLS,
} from '../../importer/importNamedPolls';
import importProcedures, {
  CRON_NAME as CRON_NAME_PROCEDURES,
} from '../../importer/importProcedures';
import { resetCronSuccessStartDate, resetCronRunningState } from './tools';
import {
  quePushsConferenceWeek,
  sendQuedPushs,
  quePushsVoteTop100,
  quePushsVoteConferenceWeek,
} from '../notifications';

// global variable to store cronjobs
const jobs = [];

const registerCronJob = (name, cronTime, cronTask, startOnInit) => {
  if (cronTime) {
    jobs.push(new CronJob(cronTime, cronTask, null, true, 'Europe/Berlin', null, startOnInit));
    global.Log.info(`[Cronjob][${name}] registered: ${cronTime}`);
  } else {
    global.Log.warn(`[Cronjob][${name}] disabled`);
  }
};

const cronJobs = async () => {
  // Server freshly started -> Reset all cron states
  // This assumes that only one instance is running on the same database
  await resetCronRunningState();
  // Procedures
  registerCronJob(
    CRON_NAME_PROCEDURES,
    CONFIG.CRON_PROCEDURES, // */15 * * * *
    importProcedures,
    CONFIG.CRON_START_ON_INIT,
  );
  // NamedPolls
  registerCronJob(
    CRON_NAME_NAMED_POLLS,
    CONFIG.CRON_NAMED_POLLS, // */15 * * * *
    importNamedPolls,
    CONFIG.CRON_START_ON_INIT,
  );
  // DeputyProfiles
  registerCronJob(
    CRON_NAME_DEPUTY_PROFILES,
    CONFIG.CRON_DEPUTY_PROFILES, // */15 * * * *
    importDeputyProfiles,
    CONFIG.CRON_START_ON_INIT,
  );
  // SheduleBIOResync - Shedule complete Resync with Bundestag.io
  registerCronJob(
    'SheduleBIOResync',
    CONFIG.CRON_SHEDULE_BIO_RESYNC, // 55 3 * */1 *
    resetCronSuccessStartDate,
    /* CONFIG.CRON_START_ON_INIT */ false, // dangerous
  );
  // sendQuedPushs
  registerCronJob(
    'sendQuedPushs',
    CONFIG.CRON_SEND_QUED_PUSHS, // */15 7-22 * * *
    sendQuedPushs,
    /* CONFIG.CRON_START_ON_INIT */ false, // dangerous
  );
  // quePushsConferenceWeek
  registerCronJob(
    'quePushsConferenceWeek',
    CONFIG.CRON_QUE_PUSHS_CONFERENCE_WEEK, // 0 14 * * SUN
    quePushsConferenceWeek,
    /* CONFIG.CRON_START_ON_INIT */ false, // dangerous
  );
  // quePushsVoteTop100
  registerCronJob(
    'quePushsVoteTop100',
    CONFIG.CRON_QUE_PUSHS_VOTE_TOP100, // 0 4 * * MON-FRI
    quePushsVoteTop100,
    /* CONFIG.CRON_START_ON_INIT */ false, // dangerous
  );
  // quePushsVoteConferenceWeek
  registerCronJob(
    'quePushsVoteConferenceWeek',
    CONFIG.CRON_QUE_PUSHS_VOTE_CONFERENCE_WEEK, // 0 4 * * MON-FRI
    quePushsVoteConferenceWeek,
    /* CONFIG.CRON_START_ON_INIT */ false, // dangerous
  );
  // Return
  return jobs;
};

module.exports = cronJobs;
