/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

import _ from 'lodash';
import apn from 'apn';
import gcm from 'node-gcm';

import apnProvider from './apn';
import gcmProvider from './gcm';
import UserModel from '../../models/User';

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
          body: message,
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
