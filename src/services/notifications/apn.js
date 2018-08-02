import apn from 'apn';
import _ from 'lodash';
import fs from 'fs';

let apnProvider = null; // eslint-disable-line

if (!apnProvider) {
  if (fs.existsSync(process.env.APPLE_APN_KEY)) {
    const options = {
      token: {
        key: process.env.APPLE_APN_KEY,
        keyId: process.env.APPLE_APN_KEY_ID,
        teamId: process.env.APPLE_TEAMID,
      },
      production: process.env.NODE_ENV === 'production',
    };

    if (_.filter(options.token, option => !option).length > 0) {
      apnProvider = new Proxy(
        {},
        {
          get: console.log,
        },
      );
    } else {
      apnProvider = new apn.Provider(options);
    }
  } else {
    console.log('ERROR: APPLE_APN_KEY Path was not found - Apple Notifications not possible');
  }
}

export default apnProvider;
