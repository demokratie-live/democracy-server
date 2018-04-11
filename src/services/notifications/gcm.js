import gcm from 'node-gcm';
import CONSTANTS from '../../config/constants';

let gcmProvider; // eslint-disable-line

if (!gcmProvider) {
  gcmProvider = new gcm.Sender(CONSTANTS.NOTIFICATION_ANDROID_SERVER_KEY);
}

export default gcmProvider;
