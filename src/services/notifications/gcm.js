import gcm from 'node-gcm';
import CONFIG from '../../config';

let gcmProvider; // eslint-disable-line

if (!gcmProvider) {
  gcmProvider = new gcm.Sender(CONFIG.NOTIFICATION_ANDROID_SERVER_KEY);
}

export default gcmProvider;
