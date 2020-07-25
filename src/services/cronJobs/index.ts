import { CronJob } from 'cron';

import CONFIG from '../../config';

import {
  resetCronSuccessStartDate,
  resetCronRunningState,
} from '@democracy-deutschland/democracy-common';

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
  // Return
  return jobs;
};

module.exports = cronJobs;
