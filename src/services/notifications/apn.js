import apn from 'apn';
import _ from 'lodash';
import fs from 'fs';
import CONFIG from '../../config';

let apnProvider = null; // eslint-disable-line

if (!apnProvider) {
  if (fs.existsSync(CONFIG.APPLE_APN_KEY)) {
    const options = {
      token: {
        key: CONFIG.APPLE_APN_KEY,
        keyId: CONFIG.APPLE_APN_KEY_ID,
        teamId: CONFIG.APPLE_TEAMID,
      },
      production: process.env.NODE_ENV === 'production',
    };

    if (_.filter(options.token, option => !option).length > 0) {
      apnProvider = new Proxy({}, {});
    } else {
      apnProvider = new apn.Provider(options);
    }
  } else {
    Log.error('ERROR: APPLE_APN_KEY Path was not found - Apple Notifications not possible');
  }
}

export default apnProvider;
