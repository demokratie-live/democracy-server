import gcm from 'node-gcm';
import CONFIG from '../../config';

const gcmSender = () => {
  const key = CONFIG.NOTIFICATION_ANDROID_SERVER_KEY;
  if (!key) {
    global.Log.error(
      'ERROR: NOTIFICATION_ANDROID_SERVER_KEY not specified in .env - Android Notifications not possible',
    );
    return;
  }
  return new gcm.Sender(key);
};

export default gcmSender();
