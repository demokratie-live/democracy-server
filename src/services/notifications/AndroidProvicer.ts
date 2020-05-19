import gcm from 'node-gcm';
import CONFIG from '../../config';

const key = CONFIG.NOTIFICATION_ANDROID_SERVER_KEY;
if (!key) {
  global.Log.error(
    'ERROR: NOTIFICATION_ANDROID_SERVER_KEY not specified in .env - Android Notifications not possible',
  );
  throw new Error(
    'ERROR: NOTIFICATION_ANDROID_SERVER_KEY not specified in .env - Android Notifications not possible',
  );
}

export default new gcm.Sender(key);
