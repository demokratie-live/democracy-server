/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */

import _ from 'lodash';
import apn from 'apn';

import apnProvider from './apn';
import gcmProvicer from './gcm';
import UserModel from '../../models/User';

export default async ({ message, user }) => {
  let userId;
  if (_.isObject(user)) {
    userId = user._id;
  }
  const userObj = await UserModel.findById(userId);
  if (userObj) {
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

        // Hier android und checken ob der case identifier korrekt ist.
        case 'android':
          // gcm

          break;

        default:
          break;
      }
    });
  }
};
