/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

import apn from 'apn';
import gcm from 'node-gcm';

import apnProvider from './apn';
import gcmProvider from './gcm';

import DeviceModel from '../../models/Device';
import ProcedureModel from '../../models/Procedure';
import CONFIG from '../../config';

// Send single iOS notification
const pushIOS = ({ title, message, payload, token }) => {
  // Check if Sending Interface is present
  if (!apnProvider) {
    Log.error('ERROR: apnProvider not present');
    return;
  }

  // Construct Data Object
  const data = new apn.Notification();
  data.alert = {
    title,
    body: message,
  };

  data.topic = CONFIG.APN_TOPIC;
  data.payload = payload;
  // This flag was included in the testPush method
  // see: https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CreatingtheNotificationPayload.html
  // data.contentAvailable = 1;

  // Do the sending
  apnProvider.send(data, token).then(response => {
    Log.notification(JSON.stringify({ type: 'apnProvider.send', response }));
  });
};

// send bulk android notifications
const bulkPushAndroid = ({ title, message, payload, tokens }) => {
  // Construct Data Object
  const gcmMessage = new gcm.Message({
    data: {
      title,
      body: message,
      payload,
    },
  });

  // Split array with tokens to smaller send packages
  while (tokens.length > 0) {
    const registrationTokens = tokens.splice(0, 100);
    gcmProvider.send(gcmMessage, { registrationTokens }, (err, response) => {
      //  TODO: drop push keys from DB (failed_tokens);
      //
      // const failed_tokens = response.results // Array with result for each token we messaged
      //   .map((res, i) => (res.error ? registrationTokens[i] : null)) // If there's any kind of error,
      //   // pick _the token_ from the _other_ array
      //   .filter(token => token);
      if (err) {
        Log.error(JSON.stringify({ type: 'gcmProvider.send', err }));
      } else {
        Log.notification(JSON.stringify({ type: 'gcmProvider.send', response }));
      }
    });
  }
};

const sendNotifications = ({ tokenObjects, title = 'DEMOCRACY', message, payload }) => {
  const androidTokens = [];

  // Remove duplicate Tokens
  const devices = tokenObjects.reduce((prev, { token, os }) => {
    const next = [...prev];
    if (!next.some(({ token: existingToken }) => existingToken === token)) {
      next.push({ token, os });
    }
    return next;
  }, []);

  // Send for iOS and collect tokens for Android to BulkPush
  devices.forEach(({ token, os }) => {
    switch (os) {
      case 'ios':
        pushIOS({ title, message, payload, token });
        break;

      case 'android':
        androidTokens.push(token);
        break;

      default:
        break;
    }
  });
  bulkPushAndroid({ title, message, payload, tokens: androidTokens });
};

// device is a Database Object
const testPush = async ({ title, message, device, payload }) => {
  if (device) {
    sendNotifications({ tokenObjects: device.pushTokens, title, message, payload });
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
      type: 'procedure',
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
      type: 'procedure',
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
      type: 'procedure',
      title,
      message: procedure.title,
    },
  });
};
// procedureUpdate({ procedureId: 231079 });

export { procedureUpdate, newVote, newVotes, newPreperation, newPreperations, testPush };
