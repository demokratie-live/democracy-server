/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

import _ from 'lodash';
import apn from 'apn';
import gcm from 'node-gcm';
import util from 'util';

import apnProvider from './apn';
import gcmProvider from './gcm';
import UserModel from '../../models/User';
import ProcedureModel from '../../models/Procedure';
import CONFIG from '../../config/constants';

const sendNotifications = ({
  tokenObjects, status, title, payload,
}) => {
  const androidNotificationTokens = [];
  tokenObjects.forEach(({ token, os }) => {
    switch (os) {
      case 'ios':
        {
          const note = new apn.Notification();

          note.alert = {
            title: status,
            body: title,
          };

          note.topic = CONFIG.APN_TOPIC;

          note.payload = payload;

          apnProvider.send(note, token).then((result) => {
            console.log('apnProvider.send', util.inspect(result, false, null));
          });
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
        title: status,
        body: title,
        payload,
        icon: 'ic_notification',
        color: '#4f81bd',
      },
      notification: {
        title: status,
        body: title,
        payload,
        icon: 'ic_notification',
        color: '#4f81bd',
      },
    });
    gcmProvider.send(
      gcmMessage,
      { registrationTokens: androidNotificationTokens },
      (err, response) => {
        if (err) console.error('gcmProvider', err);
        else console.log('gcmProvider', response);
      },
    );
  }
};

const newVote = async ({ procedureId }) => {
  const procedure = await ProcedureModel.findOne({ procedureId });
  const users = await UserModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.newVote': true,
  });
  const tokenObjects = users.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  const status = 'Jetzt Abstimmen!';
  sendNotifications({
    tokenObjects,
    status,
    title: procedure.title,
    payload: {
      procedureId,
      action: 'procedureDetails',
      title: status,
      message: procedure.title,
    },
  });
};
// newVote({ procedureId: 231079 });

const newPreperation = async ({ procedureId }) => {
  const procedure = await ProcedureModel.findOne({ procedureId });
  const users = await UserModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.newPreperation': true,
  });
  const tokenObjects = users.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  let status;
  switch (procedure.type) {
    case 'Gesetzgebung':
      status = 'Neue Gesetzesinitiative!';
      break;
    case 'Antrag':
      status = 'Neuer Antrag!';
      break;
    default:
      status = 'Neu!';
      break;
  }
  sendNotifications({
    tokenObjects,
    status,
    title: procedure.title,
    payload: {
      procedureId,
      action: 'procedureDetails',
      title: status,
      message: procedure.title,
    },
  });
};
// newPreperation({ procedureId: 231079 });

const procedureUpdate = async ({ procedureId }) => {
  const procedure = await ProcedureModel.findOne({ procedureId });
  const users = await UserModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.procedures': procedure._id,
  });
  const tokenObjects = users.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  const status = 'Update!';
  sendNotifications({
    tokenObjects,
    status,
    title: procedure.title,
    payload: {
      procedureId,
      action: 'procedureDetails',
      title: status,
      message: procedure.title,
    },
  });
};
// procedureUpdate({ procedureId: 231079 });

export { procedureUpdate, newVote, newPreperation };

export default async ({
  status, message, user, payload,
}) => {
  let userId;
  if (_.isObject(user)) {
    userId = user._id;
  }
  const userObj = await UserModel.findById(userId);
  if (userObj) {
    const androidNotificationTokens = [];
    userObj.pushTokens.forEach(({ token, os }) => {
      switch (os) {
        case 'ios':
          {
            const note = new apn.Notification();

            note.alert = {
              title: status,
              body: message,
            };

            note.topic = CONFIG.APN_TOPIC;

            note.payload = payload;

            apnProvider.send(note, token).then((result) => {
              console.log('apnProvider.send', util.inspect(result, false, null));
            });
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
          title: status,
          body: message,
          payload,
          icon: 'ic_notification',
          color: '#4f81bd',
        },
        notification: {
          title: status,
          body: message,
          payload,
          icon: 'ic_notification',
          color: '#4f81bd',
        },
      });
      gcmProvider.send(
        gcmMessage,
        { registrationTokens: androidNotificationTokens },
        (err, response) => {
          if (err) console.error('gcmProvider', err);
          else console.log('gcmProvider', response);
        },
      );
    }
  }
};
