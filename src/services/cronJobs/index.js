import { CronJob } from 'cron';

// import sendNotifications from '../../scripts/sendNotifications';
import importDeputyProfiles from '../../importer/importDeputyProfiles';
import importNamedPolls from '../../importer/importNamedPolls';
import importProcedures from '../../importer/importProcedures';
// import { resetCronSuccessStartDate } from './tools';
import {
  quePushsConferenceWeek,
  sendQuedPushs,
  quePushsVoteTop100,
  quePushsVoteConferenceWeek,
} from '../notifications';

const cronJobs = () => [
  new CronJob('*/15 * * * *', importDeputyProfiles, null, true, 'Europe/Berlin', null, true),
  new CronJob('*/15 * * * *', importNamedPolls, null, true, 'Europe/Berlin', null, true),
  new CronJob('*/15 * * * *', importProcedures, null, true, 'Europe/Berlin', null, true),
  // This is no longer needed since the sync is way better
  // TODO allow manual resync, regular resync within big timespans
  // new CronJob('55 3 * * *', resetCronSuccessStartDate, null, true, 'Europe/Berlin'),

  // PUSHS
  new CronJob('*/15 7-22 * * *', sendQuedPushs, null, true, 'Europe/Berlin'),
  new CronJob('0 14 * * SUN', quePushsConferenceWeek, null, true, 'Europe/Berlin'),
  new CronJob('0 4 * * MON-FRI', quePushsVoteTop100, null, true, 'Europe/Berlin'),
  new CronJob('0 4 * * MON-FRI', quePushsVoteConferenceWeek, null, true, 'Europe/Berlin'),
  // new CronJob('0 8 * * *', sendNotifications, null, true, 'Europe/Berlin'),
  // new CronJob('45 19 * * *', sendNotifications, null, true, 'Europe/Berlin'),
];

module.exports = cronJobs;
