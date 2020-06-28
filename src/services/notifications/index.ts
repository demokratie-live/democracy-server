import { mapSeries } from 'p-iteration';

import CONFIG from '../../config';

import {
  DeviceModel,
  PushNotificationModel,
  PUSH_CATEGORY,
  PUSH_OS,
  getCron,
  setCronStart,
  setCronSuccess,
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
