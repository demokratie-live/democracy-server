/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

import _ from 'lodash';
import apn from 'apn';
import gcm from 'node-gcm';

import apnProvider from './apn';
import gcmProvider from './gcm';
import UserModel from '../../models/User';
import ProcedureModel from '../../models/Procedure';

const sendNotifications = ({ tokenObjects, message }) => {
  const androidNotificationTokens = [];
  tokenObjects.forEach(({ token, os }) => {
    switch (os) {
      case 'ios':
        {
          const note = new apn.Notification();

          note.alert = message;
          // note.payload = { messageFrom: 'John Appleseed' };
          note.topic = 'de.democracy-deutschland.clientapp';

          apnProvider.send(note, token).then((result) => {
            console.log('apnProvider.send', result);
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
      notification: {
        title: 'DEMOCRACY',
        body: message,
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
  sendNotifications({ tokenObjects, message: `Jetzt Abstimmen!\n${procedure.title}` });
};
// newVote({ procedureId: 231079 });

const newPreperation = async ({ procedureId }) => {
  const procedure = await ProcedureModel.findOne({ procedureId });
  const users = await UserModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.newPreperation': true,
  });
  const tokenObjects = users.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  let message;
  switch (procedure.type) {
    case 'Gesetzgebung':
      message = `Neue Gesetzesinitiative!\n${procedure.title}`;
      break;
    case 'Antrag':
      message = `Neuer Antrag!\n${procedure.title}`;
      break;
    default:
      message = `Neu!\n${procedure.title}`;
      break;
  }
  sendNotifications({ tokenObjects, message });
};
// newPreperation({ procedureId: 231079 });

const procedureUpdate = async ({ procedureId }) => {
  const procedure = await ProcedureModel.findOne({ procedureId });
  const users = await UserModel.find({
    'notificationSettings.enabled': true,
    'notificationSettings.procedures': procedure._id,
  });
  const tokenObjects = users.reduce((array, { pushTokens }) => [...array, ...pushTokens], []);
  sendNotifications({ tokenObjects, message: `Update!\n${procedure.title}` });
};
// procedureUpdate({ procedureId: 231079 });

export { procedureUpdate, newVote, newPreperation };

export default async ({ message, user }) => {
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

            note.alert = message;
            // note.payload = { messageFrom: 'John Appleseed' };
            note.topic = 'de.democracy-deutschland.clientapp';

            apnProvider.send(note, token).then((result) => {
              console.log('apnProvider.send', result);
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
        notification: {
          title: 'DEMOCRACY',
          body: message,
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
