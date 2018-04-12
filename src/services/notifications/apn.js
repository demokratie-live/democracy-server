import apn from 'apn';
import _ from 'lodash';

let apnProvider; // eslint-disable-line

if (!apnProvider) {
  const options = {
    token: {
      key: process.env.APPLE_APN_KEY,
      keyId: process.env.APPLE_APN_KEY_ID,
      teamId: process.env.APPLE_TEAMID,
    },
    production: false, // TODO: handle APLPHA/BETA/PRODUCTION
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
}

export default apnProvider;
