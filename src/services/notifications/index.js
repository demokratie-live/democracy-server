/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import moment from 'moment';
import { filter, reduce } from 'p-iteration';

import CONFIG from '../../config';

import DeviceModel from '../../models/Device';
import UserModel from '../../models/User';
import ProcedureModel from '../../models/Procedure';
import VoteModel from '../../models/Vote';
import PushNotificationModel, {
  PUSH_TYPE,
  PUSH_CATEGORY,
  PUSH_OS,
} from '../../models/PushNotification';

import { getCron, setCronStart, setCronSuccess } from '../cronJobs/tools';

import { push as pushIOS } from './iOS';
import { push as pushAndroid } from './Android';

export const sendQuedPushs = async () => {
  const CRON_NAME = 'sendQuedPushs';
  const startDate = new Date();
  const cron = await getCron({ name: CRON_NAME });
  if (cron.running) {
    Log.error(`[Cronjob][${CRON_NAME}] running still - skipping`);
    return;
  }
  await setCronStart({ name: CRON_NAME, startDate });

  // Query Database
  const pushs = await PushNotificationModel.find({ sent: false, time: { $lte: new Date() } });
  // send all pushs in there
  const sentPushs = await pushs.map(
    ({ _id, type, category, title, message, procedureIds, token, os }) => {
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
          pushAndroid({
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
                  Log.warn(`[PUSH] Android failure - removig token`);
                } else {
                  Log.error(`[PUSH] Android failure ${JSON.stringify({ token, err, response })}`);
                }
              }
            },
          });
          break;
        case PUSH_OS.IOS:
          pushIOS({
            title,
            message,
            payload,
            token,
            callback: async ({ sent, failed }) => {
              Log.info(JSON.stringify({ type: 'apnProvider.send', sent, failed }));
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
                  Log.warn(`[PUSH] IOS failure - removig token`);
                } else {
                  Log.error(`[PUSH] IOS failure ${JSON.stringify({ token, sent, failed })}`);
                }
              }
            },
          });
          break;
        default:
          Log.error(`[PUSH] unknown Token-OS`);
      }
      // Return id
      return _id;
    },
  );
  // Set sent = true
  await PushNotificationModel.update(
    { _id: { $in: sentPushs } },
    { $set: { sent: true } },
    { multi: true },
  );

  if (sentPushs.length > 0) {
    Log.info(`[PUSH] Sent ${sentPushs.length} Pushs`);
  }

  await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
};

export const quePushs = async ({
  type,
  category,
  title,
  message,
  procedureIds,
  tokens,
  time = new Date(),
}) => {
  // Generate one push for each token
  const docs = tokens.map(({ token, os }) => {
    return {
      type,
      category,
      title,
      message,
      procedureIds,
      token,
      os,
      time,
    };
  });

  await PushNotificationModel.insertMany(docs);

  return true;
};

// This is called every Sunday by a Cronjob
export const quePushsConferenceWeek = async () => {
  /*
  Kommende Woche ist Sitzungswoche!
  Es warten 13 spannende Themen auf Dich. Viel Spaß beim Abstimmen.
  (Sonntag vor Sitzungswoche, alle)
  */

  const CRON_NAME = 'quePushsConferenceWeek';
  const startDate = new Date();
  const cron = await getCron({ name: CRON_NAME });
  if (cron.running) {
    Log.error(`[Cronjob][${CRON_NAME}] running still - skipping`);
    return;
  }
  await setCronStart({ name: CRON_NAME, startDate });

  // Find coresponding Procedures
  const startOfWeek = moment()
    .startOf('week')
    .toDate(); // Should be So
  const endOfWeek = moment()
    .endOf('week')
    .toDate(); // Should be Sa
  const procedures = await ProcedureModel.find(
    { $and: [{ voteDate: { $gte: startOfWeek } }, { voteDate: { $lte: endOfWeek } }] },
    { procedureId: 1 },
  );
  const procedureIds = procedures.map(p => p.procedureId);

  // Find Devices & Tokens
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.conferenceWeekPushs': true,
  });
  const tokens = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);

  // Only send Message if at least one vote & one token is found
  if (tokens.length > 0 && procedureIds.length > 0) {
    const title = 'Kommende Woche ist Sitzungswoche!';
    const message =
      procedureIds.length === 1
        ? `Es wartet 1 spannendes Thema auf Dich. Viel Spaß beim Abstimmen.`
        : `Es warten ${procedureIds.length} spannende Themen auf Dich. Viel Spaß beim Abstimmen.`;
    quePushs({
      type: PUSH_TYPE.PROCEDURE_BULK,
      category: PUSH_CATEGORY.CONFERENCE_WEEK,
      title,
      message,
      procedureIds,
      tokens,
    });
  }
  await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
};

export const quePushsVoteTop100 = async () => {
  /*
  TOP 100 - #1: Jetzt Abstimmen!
  Lorem Ipsum Titel
  (Top 100, Außerhalb der Sitzungwoche, 1x pro Tag, individuell)
  */

  const CRON_NAME = 'quePushsVoteTop100';
  const startDate = new Date();
  const cron = await getCron({ name: CRON_NAME });
  if (cron.running) {
    Log.error(`[Cronjob][${CRON_NAME}] running still - skipping`);
    return;
  }
  await setCronStart({ name: CRON_NAME, startDate });

  // Check if we have a ConferenceWeek
  const startOfWeek = moment()
    .startOf('isoweek')
    .toDate(); // Should be Mo
  const endOfWeek = moment()
    .endOf('isoweek')
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
    devices = await filter(
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
              time: { $gte: moment().subtract(1, 'months') },
            });
            if (pastPushs === 0) {
              return [...acc, token];
            }
            return acc;
          },
          [],
        );
        // Dont send Pushs - User has not Tokens registered or has recieved a Push for this Procedure lately
        if (tokens.length === 0) {
          return true;
        }
        // Calculate random Time:
        const time = new Date();
        time.setHours(9 + Math.round(Math.random() * 9));
        // Send Pushs
        quePushs({
          type: PUSH_TYPE.PROCEDURE,
          category: PUSH_CATEGORY.TOP100,
          title: `TOP 100 - #${topId}: Jetzt Abstimmen!`,
          message: procedure.title,
          procedureIds: [procedure.procedureId],
          tokens,
          time,
        });
        // We have qued a Push, remove device from list.
        return false;
      },
      [],
    );
    // Count the Top Number up
    topId += 1;
  }
  await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
};

export const quePushsOutcome = async procedureId => {
  /*
  Offizielles Ergebnis zu Deiner Abstimmung
  Lorem Ipsum Titel
  (Glocke, nicht limitiert, abgestimmt, alle)
  */

  /*
  Offizielles Ergebnis zur Abstimmung
  Lorem Ipsum Titel
  (Glocke, nicht limitiert, nicht abgestimmt, alle)
  */

  // find procedure
  const procedure = await ProcedureModel.findOne({ procedureId });

  // Check if we found the procedure
  if (!procedure) {
    Log.error(`[PUSH] Unknown Procedure ${procedureId}`);
    return;
  }
  // Find Devices
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    pushTokens: { $gt: [] },
    'notificationSettings.procedures': procedure._id,
  });

  // loop through the devices and send Pushs
  for (let i = 0; i < devices.length; i += 1) {
    const device = devices[i];
    // Dont continue if we have no push tokens
    let voted = null;
    // Check if device is associcated with a vote on the procedure
    if (CONFIG.SMS_VERIFICATION) {
      // eslint-disable-next-line no-await-in-loop
      const user = await UserModel.findOne({ device: device._id, verified: true });
      if (user) {
        // eslint-disable-next-line no-await-in-loop
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
      // eslint-disable-next-line no-await-in-loop
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

    const title = voted
      ? 'Offizielles Ergebnis zu Deiner Abstimmung'
      : 'Offizielles Ergebnis zur Abstimmung';
    const message = procedure.title;
    quePushs({
      type: PUSH_TYPE.PROCEDURE,
      category: PUSH_CATEGORY.OUTCOME,
      title,
      message,
      procedureIds: [procedureId],
      tokens: device.pushTokens,
    });
  }
};

export const quePushsVoteConferenceWeek = async () => {
  /*
  Diese Woche im Bundestag: Jetzt Abstimmen!
  Lorem Ipsum Titel
  (Innerhalb der Sitzungswoche, nicht abgestimmt, nicht vergangen, 1x pro Tag, individuell)
  */

  const CRON_NAME = 'quePushsVoteConferenceWeek';
  const startDate = new Date();
  const cron = await getCron({ name: CRON_NAME });
  if (cron.running) {
    Log.error(`[Cronjob][${CRON_NAME}] running still - skipping`);
    return;
  }
  await setCronStart({ name: CRON_NAME, startDate });

  // Check if we have a ConferenceWeek
  const startOfWeek = moment()
    .startOf('isoweek')
    .toDate(); // Should be Mo
  const endOfWeek = moment()
    .endOf('isoweek')
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
          { $or: [{ voteEnd: { $exists: false } }, { voteEnd: { $eq: null } }] },
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
    devices = await filter(
      devices,
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
              category: PUSH_CATEGORY.CONFERENCE_WEEK_VOTE,
              procedureIds: procedure.procedureId,
              token: token.token,
              os: token.os,
              time: { $gte: moment().subtract(1, 'weeks') },
            });
            if (pastPushs === 0) {
              return [...acc, token];
            }
            return acc;
          },
          [],
        );
        // Dont send Pushs - User has not Tokens registered or has recieved a Push for this Procedure lately
        if (tokens.length === 0) {
          return true;
        }
        // Calculate random Time:
        const time = new Date();
        time.setHours(9 + Math.round(Math.random() * 9));
        // Send Pushs
        quePushs({
          type: PUSH_TYPE.PROCEDURE,
          category: PUSH_CATEGORY.CONFERENCE_WEEK_VOTE,
          title: 'Diese Woche im Bundestag: Jetzt Abstimmen!',
          message: procedure.title,
          procedureIds: [procedure.procedureId],
          tokens,
          time,
        });
        // We have qued a Push, remove device from list.
        return false;
      },
      [],
    );
  }
  await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
};
