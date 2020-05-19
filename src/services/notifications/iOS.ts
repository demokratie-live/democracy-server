import apn from 'apn';
import CONFIG from '../../config';
import apnProvider from './iOSProvicer';

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
