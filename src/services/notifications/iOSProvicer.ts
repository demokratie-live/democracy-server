import apn from 'apn';
import CONFIG from '../../config';

const key = CONFIG.APPLE_APN_KEY;
const keyId = CONFIG.APPLE_APN_KEY_ID;
const teamId = CONFIG.APPLE_TEAMID;
const production = process.env.NODE_ENV === 'production';

const apnProvider = () => {
  if (!key) {
    global.Log.error('ERROR: APPLE_APN_KEY Path was not found - Apple Notifications not possible');
    return;
  }
  if (!keyId || !teamId) {
    global.Log.error(
      'ERROR: APPLE_APN_KEY_ID or APPLE_TEAMID not specified in .env - Apple Notifications not possible',
    );
    throw new Error(
      'ERROR: APPLE_APN_KEY_ID or APPLE_TEAMID not specified in .env - Apple Notifications not possible',
    );
  }

  const options = {
    token: { key, keyId, teamId },
    production,
  };

  return new apn.Provider(options);
};

export default apnProvider();
