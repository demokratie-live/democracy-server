import { testCronTime } from '../services/cronJobs/tools';

export default {
  CRON_START_ON_INIT: process.env.CRON_START_ON_INIT === 'true',
  CRON_PROCEDURES: testCronTime(process.env.CRON_PROCEDURES) ? process.env.CRON_PROCEDURES : false,
  CRON_NAMED_POLLS: testCronTime(process.env.CRON_NAMED_POLLS)
    ? process.env.CRON_NAMED_POLLS
    : false,
  CRON_DEPUTY_PROFILES: testCronTime(process.env.CRON_DEPUTY_PROFILES)
    ? process.env.CRON_DEPUTY_PROFILES
    : false,
  CRON_SHEDULE_BIO_RESYNC: testCronTime(process.env.CRON_SHEDULE_BIO_RESYNC)
    ? process.env.CRON_SHEDULE_BIO_RESYNC
    : false,
  CRON_SEND_QUED_PUSHS: testCronTime(process.env.CRON_SEND_QUED_PUSHS)
    ? process.env.CRON_SEND_QUED_PUSHS
    : false,
  CRON_QUE_PUSHS_CONFERENCE_WEEK: testCronTime(process.env.CRON_QUE_PUSHS_CONFERENCE_WEEK)
    ? process.env.CRON_QUE_PUSHS_CONFERENCE_WEEK
    : false,
  CRON_QUE_PUSHS_VOTE_TOP100: testCronTime(process.env.CRON_QUE_PUSHS_VOTE_TOP100)
    ? process.env.CRON_QUE_PUSHS_VOTE_TOP100
    : false,
  CRON_QUE_PUSHS_VOTE_CONFERENCE_WEEK: testCronTime(process.env.CRON_QUE_PUSHS_VOTE_CONFERENCE_WEEK)
    ? process.env.CRON_QUE_PUSHS_VOTE_CONFERENCE_WEEK
    : false,
};
