import { CronJob } from 'cron';

import CONFIG from '../../config';

import {
  resetCronSuccessStartDate,
  resetCronRunningState,
} from '@democracy-deutschland/democracy-common';
import {
  sendQueuedPushs,
  queuePushsVoteTop100,
  queuePushsVoteConferenceWeek,
} from '../notifications';

// global variable to store cronjobs
const jobs: CronJob[] = [];

const registerCronJob = ({
  name,
  cronTime,
  cronTask,
  startOnInit,
}: {
  name: string;
  cronTime?: string;
  cronTask: () => void;
  startOnInit: boolean;
}) => {
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
  // SheduleBIOResync - Shedule complete Resync with Bundestag.io
  registerCronJob({
    name: 'SheduleBIOResync',
    cronTime: CONFIG.CRON_SHEDULE_BIO_RESYNC, // 55 3 * */1 *
    cronTask: resetCronSuccessStartDate,
    startOnInit: /* CONFIG.CRON_START_ON_INIT */ false, // dangerous
  });
  // sendQueuedPushs
  registerCronJob({
    name: 'sendQueuedPushs',
    cronTime: CONFIG.CRON_SEND_QUED_PUSHS, // */15 7-22 * * *
    cronTask: sendQueuedPushs,
    startOnInit: /* CONFIG.CRON_START_ON_INIT */ false, // dangerous
  });
  // queuePushsVoteTop100
  registerCronJob({
    name: 'queuePushsVoteTop100',
    cronTime: CONFIG.CRON_QUE_PUSHS_VOTE_TOP100, // 0 4 * * MON-FRI
    cronTask: queuePushsVoteTop100,
    startOnInit: /* CONFIG.CRON_START_ON_INIT */ false, // dangerous
  });
  // queuePushsVoteConferenceWeek
  registerCronJob({
    name: 'queuePushsVoteConferenceWeek',
    cronTime: CONFIG.CRON_QUE_PUSHS_VOTE_CONFERENCE_WEEK, // 0 4 * * MON-FRI
    cronTask: queuePushsVoteConferenceWeek,
    startOnInit: /* CONFIG.CRON_START_ON_INIT */ false, // dangerous
  });
  // Return
  return jobs;
};

module.exports = cronJobs;
