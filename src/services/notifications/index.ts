/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import moment from 'moment';
import { reduce, mapSeries, filterSeries } from 'p-iteration';

import CONFIG from '../../config';

import {
  ProcedureModel,
  DeviceModel,
  UserModel,
  VoteModel,
  PushNotificationModel,
  PUSH_TYPE,
  PUSH_CATEGORY,
  PUSH_OS,
  getCron,
  setCronStart,
  setCronSuccess,
  queuePushs,
} from '@democracy-deutschland/democracy-common';

import { push as pushIOS } from './iOS';
import { push as pushAndroid } from './Android';

export const sendQueuedPushs = async () => {
  const CRON_NAME = 'sendQueuedPushs';
  const startDate = new Date();
  const cron = await getCron({ name: CRON_NAME });
  if (cron.running) {
    global.Log.error(`[Cronjob][${CRON_NAME}] running still - skipping`);
    return;
  }
  await setCronStart({ name: CRON_NAME, startDate });

  // Query Database
  let pushs = [];

  // TODO handle date fix timezone by server

  // outcome push's first
  pushs = await PushNotificationModel.find({
    sent: false,
    time: { $lte: new Date() },
    category: PUSH_CATEGORY.OUTCOME,
  }).limit(CONFIG.CRON_SEND_QUED_PUSHS_LIMIT);

  if (pushs.length !== CONFIG.CRON_SEND_QUED_PUSHS_LIMIT) {
    pushs = [
      ...pushs,
      ...(await PushNotificationModel.find({
        sent: false,
        time: { $lte: new Date() },
        category: { $ne: PUSH_CATEGORY.OUTCOME },
      }).limit(CONFIG.CRON_SEND_QUED_PUSHS_LIMIT - pushs.length)),
    ];
  }

  // send all pushs in there
  const sentPushs = await mapSeries(
    pushs,
    async ({ _id, type, category, title, message, procedureIds, token, os }) => {
      // Construct Payload
      const payload = {
        type,
        action: type,
        category,
        title,
        message,
        procedureId: procedureIds[0],
        procedureIds,
      };
      // Send Pushs
      switch (os) {
        case PUSH_OS.ANDROID:
          await pushAndroid({
            title,
            message,
            payload,
            token,
            callback: async (err, response) => {
              if (err || response.success !== 1 || response.failure !== 0) {
                // Write failure to Database
                await PushNotificationModel.update(
                  { _id },
                  { $set: { failure: JSON.stringify({ err, response }) } },
                );
                // Remove broken Push tokens
                if (response.results && response.results[0].error === 'NotRegistered') {
                  await DeviceModel.update(
                    {},
                    { $pull: { pushTokens: { token, os: PUSH_OS.ANDROID } } },
                    { multi: true },
                  );
                  global.Log.warn(`[PUSH] Android failure - removig token`);
                } else {
                  global.Log.error(
                    `[PUSH] Android failure ${JSON.stringify({ token, err, response })}`,
                  );
                }
              }
            },
          });
          break;
        case PUSH_OS.IOS:
          await pushIOS({
            title,
            message,
            payload,
            token,
            callback: async ({ sent, failed }) => {
              global.Log.info(JSON.stringify({ type: 'apnProvider.send', sent, failed }));
              if (sent.length === 0 && failed.length !== 0) {
                // Write failure to Database
                await PushNotificationModel.update(
                  { _id },
                  { $set: { failure: JSON.stringify({ failed }) } },
                );
                // Remove broken Push tokens
                if (
                  failed[0].response &&
                  (failed[0].response.reason === 'DeviceTokenNotForTopic' ||
                    failed[0].response.reason === 'BadDeviceToken')
                ) {
                  await DeviceModel.update(
                    {},
                    { $pull: { pushTokens: { token, os: PUSH_OS.IOS } } },
                    { multi: true },
                  );
                  global.Log.warn(`[PUSH] IOS failure - removig token`);
                } else {
                  global.Log.error(`[PUSH] IOS failure ${JSON.stringify({ token, sent, failed })}`);
                }
              }
            },
          });
          break;
        default:
          global.Log.error(`[PUSH] unknown Token-OS`);
      }
      // Set sent = true
      await PushNotificationModel.update({ _id }, { $set: { sent: true } }).then(() => {
        global.Log.info('### Push sent');
      });
      // Return id
      return _id;
    },
  );
  global.Log.info('### Push counter', sentPushs.length);

  if (sentPushs.length > 0) {
    global.Log.info(`[PUSH] Sent ${sentPushs.length} Pushs`);
  }

  await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
};

export const queuePushsVoteTop100 = async () => {
  global.Log.info('queuePushsVoteTop100');
  /*
  TOP 100 - #1: Jetzt Abstimmen!
  Lorem Ipsum Titel
  (Top 100, Außerhalb der Sitzungwoche, 1x pro Tag, individuell)
  */

  const CRON_NAME = 'queuePushsVoteTop100';
  const startDate = new Date();
  const cron = await getCron({ name: CRON_NAME });
  if (cron.running) {
    global.Log.error(`[Cronjob][${CRON_NAME}] running still - skipping`);
    return;
  }
  await setCronStart({ name: CRON_NAME, startDate });

  // Check if we have a ConferenceWeek
  const startOfWeek = moment()
    .startOf('isoWeek')
    .toDate(); // Should be Mo
  const endOfWeek = moment()
    .endOf('isoWeek')
    .toDate(); // Should be So
  const conferenceProceduresCount = await ProcedureModel.count({
    $and: [{ voteDate: { $gte: startOfWeek } }, { voteDate: { $lte: endOfWeek } }],
  });

  // Dont Push TOP100 if we have an active conferenceWeek
  if (conferenceProceduresCount > 0) {
    await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
    return;
  }

  // find TOP100 procedures
  const top100Procedures = await ProcedureModel.find({ period: 19 })
    .sort({ activities: -1, lastUpdateDate: -1, title: 1 })
    .limit(100);

  // Find Devices
  let devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.voteTOP100Pushs': true,
    pushTokens: { $gt: [] },
  });

  // loop through the TOP100
  let topId = 1;
  for (let i = 0; i < top100Procedures.length; i += 1) {
    const procedure = top100Procedures[i];
    // Skip some calls
    if (devices.length === 0) {
      continue; // eslint-disable-line no-continue
    }
    // loop through the devices and remove those we send a Push
    // eslint-disable-next-line no-await-in-loop
    devices = await filterSeries(
      devices,
      // eslint-disable-next-line no-loop-func
      async device => {
        let voted = null;
        // Check if device is associcated with a vote on the procedure
        if (CONFIG.SMS_VERIFICATION) {
          const user = await UserModel.findOne({ device: device._id, verified: true });
          if (user) {
            voted = await VoteModel.findOne({
              procedure: procedure._id,
              type: 'Phone',
              voters: {
                $elemMatch: {
                  voter: user.phone,
                },
              },
            });
          }
        } else {
          voted = await VoteModel.findOne({
            procedure: procedure._id,
            type: 'Device',
            voters: {
              $elemMatch: {
                voter: device._id,
              },
            },
          });
        }
        // Dont send Pushs - User has voted already
        if (voted) {
          return true;
        }
        // Check if we sent the user a notifiation in the past time on that procedure
        const tokens = await reduce(
          device.pushTokens,
          async (acc, token) => {
            const pastPushs = await PushNotificationModel.count({
              category: PUSH_CATEGORY.TOP100,
              procedureIds: procedure.procedureId,
              token: token.token,
              os: token.os,
              time: {
                $gte: moment()
                  .subtract(1, 'month')
                  .toDate(),
              },
            });
            if (pastPushs === 0) {
              return [...acc, token];
            }
            return acc;
          },
          [] as Array<{
            token: string;
            os: string;
          }>,
        );
        // Dont send Pushs - User has not Tokens registered or has recieved a Push for this Procedure lately
        if (tokens.length === 0) {
          return true;
        }
        // Calculate random Time:
        const time = new Date();
        time.setHours(9 + Math.round(Math.random() * 9));
        // Send Pushs
        queuePushs({
          type: PUSH_TYPE.PROCEDURE,
          category: PUSH_CATEGORY.TOP100,
          title: `TOP 100 - #${topId}: Jetzt Abstimmen!`,
          message: procedure.title,
          procedureIds: [procedure.procedureId],
          tokens,
          time,
        });
        // We have queued a Push, remove device from list.
        return false;
      },
      [],
    );
    // Count the Top Number up
    topId += 1;
  }
  await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
};

export const queuePushsVoteConferenceWeek = async () => {
  /*
  Diese Woche im Bundestag: Jetzt Abstimmen!
  Lorem Ipsum Titel
  (Innerhalb der Sitzungswoche, nicht abgestimmt, nicht vergangen, 1x pro Tag, individuell)
  */

  const CRON_NAME = 'queuePushsVoteConferenceWeek';
  const startDate = new Date();
  const cron = await getCron({ name: CRON_NAME });
  if (cron.running) {
    global.Log.error(`[Cronjob][${CRON_NAME}] running still - skipping`);
    return;
  }
  await setCronStart({ name: CRON_NAME, startDate });

  // Check if we have a ConferenceWeek
  const startOfWeek = moment()
    .startOf('isoWeek')
    .toDate(); // Should be Mo
  const endOfWeek = moment()
    .endOf('isoWeek')
    .toDate(); // Should be So
  const conferenceProceduresCount = await ProcedureModel.count({
    $and: [{ voteDate: { $gte: startOfWeek } }, { voteDate: { $lte: endOfWeek } }],
  });

  // Dont Push ConfereceWeek Updates if we have dont have an active conferenceWeek
  if (conferenceProceduresCount === 0) {
    await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
    return;
  }

  // find ConferenceWeek procedures not voted
  const conferenceWeekProcedures = await ProcedureModel.find({
    period: 19,
    $or: [
      {
        $and: [
          { voteDate: { $gte: new Date() } },
          { $or: [{ voteEnd: { $exists: false } }, { voteEnd: undefined }] },
        ],
      },
      { voteEnd: { $gte: new Date() } },
    ],
  }).sort({ activities: -1, lastUpdateDate: -1, title: 1 });

  // Find Devices
  let devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.voteConferenceWeekPushs': true,
    pushTokens: { $gt: [] },
  });

  // loop through the ConferenceWeek Procedures
  for (let i = 0; i < conferenceWeekProcedures.length; i += 1) {
    const procedure = conferenceWeekProcedures[i];
    // Skip some calls
    if (devices.length === 0) {
      continue; // eslint-disable-line no-continue
    }
    // loop through the devices and remove those we send a Push
    // eslint-disable-next-line no-await-in-loop
    devices = await filterSeries(devices, async device => {
      let voted = null;
      // Check if device is associcated with a vote on the procedure
      if (CONFIG.SMS_VERIFICATION) {
        const user = await UserModel.findOne({ device: device._id, verified: true });
        if (user) {
          voted = await VoteModel.findOne({
            procedure: procedure._id,
            type: 'Phone',
            voters: {
              $elemMatch: {
                voter: user.phone,
              },
            },
          });
        }
      } else {
        voted = await VoteModel.findOne({
          procedure: procedure._id,
          type: 'Device',
          voters: {
            $elemMatch: {
              voter: device._id,
            },
          },
        });
      }
      // Dont send Pushs - User has voted already
      if (voted) {
        return true;
      }
      // Check if we sent the user a notifiation in the past time on that procedure
      const tokens = await reduce(
        device.pushTokens,
        async (acc, token) => {
          const pastPushs = await PushNotificationModel.count({
            category: PUSH_CATEGORY.CONFERENCE_WEEK_VOTE,
            procedureIds: procedure.procedureId,
            token: token.token,
            os: token.os,
            time: {
              $gte: moment()
                .subtract(1, 'weeks')
                .toDate(),
            },
          });
          if (pastPushs === 0) {
            return [...acc, token];
          }
          return acc;
        },
        [] as Array<{
          token: string;
          os: string;
        }>,
      );
      // Dont send Pushs - User has not Tokens registered or has recieved a Push for this Procedure lately
      if (tokens.length === 0) {
        return true;
      }
      // Calculate random Time:
      const time = new Date();
      time.setHours(9 + Math.round(Math.random() * 9));
      // Save Pushs
      await queuePushs({
        type: PUSH_TYPE.PROCEDURE,
        category: PUSH_CATEGORY.CONFERENCE_WEEK_VOTE,
        title: 'Diese Woche im Bundestag: Jetzt Abstimmen!',
        message: procedure.title,
        procedureIds: [procedure.procedureId],
        tokens,
        time,
      });
      // We have queued a Push, remove device from list.
      return false;
    });
  }
  await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
};
