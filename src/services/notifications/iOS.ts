import apn from 'apn';
// import _ from 'lodash';
import fs from 'fs';
import CONFIG from '../../config';

export const provider = (
  key = CONFIG.APPLE_APN_KEY,
  keyId = CONFIG.APPLE_APN_KEY_ID,
  teamId = CONFIG.APPLE_TEAMID,
  production = process.env.NODE_ENV === 'production',
) => {
  if (!key || !fs.existsSync(key)) {
    global.Log.error('ERROR: APPLE_APN_KEY Path was not found - Apple Notifications not possible');
    return null;
  }
  if (!keyId || !teamId) {
    global.Log.error(
      'ERROR: APPLE_APN_KEY_ID or APPLE_TEAMID not specified in .env - Apple Notifications not possible',
    );
    return null;
  }

  const options = {
    token: { key, keyId, teamId },
    production,
  };

  return new apn.Provider(options);
};

// Send single iOS notification
export const push = ({
  title,
  message,
  payload,
  token,
  callback,
}: {
  title: string;
  message: string;
  payload: any;
  token: string;
  callback: (response: apn.Responses) => void;
}) => {
  const apnProvider = provider();

  // Check if Sending Interface is present
  if (!apnProvider) {
    global.Log.error('ERROR: apnProvider not present');
    return;
  }

  // Construct Data Object
  const data = new apn.Notification();
  data.alert = {
    title,
    body: message,
  };

  data.topic = CONFIG.APN_TOPIC;
  data.payload = payload;

  // Do the sending
  apnProvider.send(data, token).then(response => {
    callback(response);
  });
};
