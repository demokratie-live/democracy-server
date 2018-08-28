/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

import _ from 'lodash';
import apn from 'apn';
import gcm from 'node-gcm';
import util from 'util';

import apnProvider from './apn';
import gcmProvider from './gcm';

import DeviceModel from '../../models/Device';
import ProcedureModel from '../../models/Procedure';
import CONSTANTS from '../../config/constants';

const sendNotifications = ({ tokenObjects, title = 'DEMOCRACY', message, payload }) => {
  const androidNotificationTokens = [];

  const devices = tokenObjects.reduce((prev, { token, os }) => {
    const next = [...prev];
    if (!next.some(({ token: existingToken }) => existingToken === token)) {
      next.push({ token, os });
    }
    return next;
  }, []);

  devices.forEach(({ token, os }) => {
    switch (os) {
      case 'ios':
        {
          const note = new apn.Notification();

          note.alert = {
            title,
            body: message,
          };

          note.topic = CONSTANTS.APN_TOPIC;

          note.payload = payload;

          if (apnProvider) {
            apnProvider.send(note, token).then(result => {
              Log.notification({
                type: 'apnProvider.send',
                data: util.inspect(result, false, null),
              });
            });
          } else {
            Log.error('ERROR: apnProvider not present');
          }
        }
        break;

      case 'android':
        // Prepare android notifications
        androidNotificationTokens.push(token);
        break;

      default:
        break;
    }
  });
  // send bulk send android notifications
  if (androidNotificationTokens.length > 0) {
    const gcmMessage = new gcm.Message({
      data: {
        title,
        body: message,
        payload,
      },
    });
    gcmProvider.send(
      gcmMessage,
      { registrationTokens: androidNotificationTokens },
      (err, response) => {
        if (err) Log.error(JSON.stringify({ type: 'gcmProvider', err }));
        else {
          Log.notification(JSON.stringify({ type: 'gcmProvider', response }));
        }
      },
    );
  }
};

const newVote = async ({ procedureId }) => {
  const procedure = await ProcedureModel.findOne({ procedureId });
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.newVote': true,
  });
  const tokenObjects = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  const title = 'Jetzt Abstimmen!';
  sendNotifications({
    tokenObjects,
    title,
    message: procedure.title,
    payload: {
      procedureId,
      action: 'procedureDetails',
      title,
      message: procedure.title,
    },
  });
};

const newVotes = async ({ procedureIds }) => {
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.newVote': true,
  });
  const tokenObjects = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  const title = 'Jetzt Abstimmen!';
  let message = `Es gibt ${procedureIds.length} neue Abstimmungen.`;
  let type = 'procedureBulk';
  if (procedureIds.length === 1) {
    const procedure = await ProcedureModel.findOne({
      procedureId: procedureIds[0],
    });
    message = `${procedure.title}`;
    type = 'procedure';
  }
  sendNotifications({
    tokenObjects,
    title,
    message,
    payload: {
      procedureId: procedureIds[0],
      procedureIds,
      title,
      message,
      action: type,
      type,
    },
  });
};
// newVote({ procedureId: 231079 });

const newPreperation = async ({ procedureId }) => {
  const procedure = await ProcedureModel.findOne({ procedureId });
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.newPreperation': true,
  });
  const tokenObjects = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  let title;
  switch (procedure.type) {
    case 'Gesetzgebung':
      title = 'Neue Gesetzesinitiative!';
      break;
    case 'Antrag':
      title = 'Neuer Antrag!';
      break;
    default:
      title = 'Neu!';
      break;
  }
  sendNotifications({
    tokenObjects,
    title,
    message: procedure.title,
    payload: {
      procedureId,
      action: 'procedureDetails',
      title,
      message: procedure.title,
    },
  });
};

const newPreperations = async ({ procedureIds }) => {
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.newPreperation': true,
  });
  const tokenObjects = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  const title = 'Neu in Vorbereitung!';
  let message = `${procedureIds.length} Elemente neu in Vorbereitung`;
  let type = 'procedureBulk';

  if (procedureIds.length === 1) {
    const procedure = await ProcedureModel.findOne({
      procedureId: procedureIds[0],
    });
    message = `${procedure.title}`;
    type = 'procedure';
  }
  sendNotifications({
    tokenObjects,
    title,
    message,
    payload: {
      procedureIds,
      procedureId: procedureIds[0],
      title,
      message,
      action: type,
      type,
    },
  });
};
// newPreperation({ procedureId: 231079 });

const procedureUpdate = async ({ procedureId }) => {
  const procedure = await ProcedureModel.findOne({ procedureId });
  const devices = await DeviceModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.procedures': procedure._id,
  });
  const tokenObjects = devices.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  const title = 'Update!';
  sendNotifications({
    tokenObjects,
    title,
    message: procedure.title,
    payload: {
      procedureId,
      action: 'procedureDetails',
      title,
      message: procedure.title,
    },
  });
};
// procedureUpdate({ procedureId: 231079 });

export { procedureUpdate, newVote, newVotes, newPreperation, newPreperations };

export default async ({ title, message, device, payload }) => {
  let deviceId;
  if (_.isObject(device)) {
    deviceId = device._id;
  }
  const deviceObj = await DeviceModel.findById(deviceId);
  if (deviceObj) {
    const androidNotificationTokens = [];
    deviceObj.pushTokens.forEach(({ token, os }) => {
      switch (os) {
        case 'ios':
          {
            const note = new apn.Notification();

            note.alert = {
              title,
              body: message,
            };

            note.topic = CONSTANTS.APN_TOPIC;
            note.contentAvailable = 1;

            note.payload = payload;

            if (apnProvider) {
              apnProvider.send(note, token).then(result => {
                Log.notification(
                  JSON.stringify({
                    type: 'apnProvider.send',
                    data: util.inspect(result, false, null),
                  }),
                );
              });
            } else {
              Log.error('ERROR: apnProvider not present');
            }
          }
          break;

        case 'android':
          // Prepare android notifications
          androidNotificationTokens.push(token);
          break;

        default:
          break;
      }
    });
    // send bulk send android notifications
    if (androidNotificationTokens.length > 0) {
      const gcmMessage = new gcm.Message({
        data: {
          title,
          body: message,
          payload,
        },
      });
      gcmProvider.send(
        gcmMessage,
        { registrationTokens: androidNotificationTokens },
        (err, response) => {
          if (err) {
            Log.error(
              JSON.stringify({
                type: 'gcmProvider',
                err,
              }),
            );
          } else {
            Log.notification(JSON.stringify({ type: 'gcmProvider', response }));
          }
        },
      );
    }
  }
};
