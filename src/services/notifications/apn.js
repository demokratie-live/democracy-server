import apn from 'apn';

let apnProvider; // eslint-disable-line

if (!apnProvider) {
  const options = {
    token: {
      key: process.env.APPLE_APN_KEY,
      keyId: process.env.APPLE_APN_KEY_ID,
      teamId: process.env.APPLE_TEAMID,
    },
    production: false,
  };

  apnProvider = new apn.Provider(options);
}

export default apnProvider;
