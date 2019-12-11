import gcm from 'node-gcm';
import CONFIG from '../../config';

export const provider = (key = CONFIG.NOTIFICATION_ANDROID_SERVER_KEY) => {
  if(!key){
    Log.error('ERROR: NOTIFICATION_ANDROID_SERVER_KEY not specified in .env - Android Notifications not possible');
    return null;
  }

  return new gcm.Sender(key);
}

// send bulk android notifications
export const pushBulk = ({ title, message, payload, tokens }) => {

  const gcmProvider = provider();

  // Check if Sending Interface is present
  if (!gcmProvider) {
    Log.error('ERROR: gcmProvider not present');
    return;
  }

  // Construct Data Object
  const gcmMessage = new gcm.Message({
    data: {
      title,
      body: message,
      payload,
    },
  });

  // Split array with tokens to smaller send packages
  while (tokens.length > 0) {
    const registrationTokens = tokens.splice(0, 100);
    gcmProvider.send(gcmMessage, { registrationTokens }, (err, response) => {
      //  TODO: drop push keys from DB (failed_tokens);
      //
      // const failed_tokens = response.results // Array with result for each token we messaged
      //   .map((res, i) => (res.error ? registrationTokens[i] : null)) // If there's any kind of error,
      //   // pick _the token_ from the _other_ array
      //   .filter(token => token);
      if (err || response.success !== 1 || response.failure !== 0) {
        Log.error(JSON.stringify({ type: 'gcmProvider.send', registrationTokens, err, response }));
      } else {
        Log.info(JSON.stringify({ type: 'gcmProvider.send', response }));
      }
    });
  }
};
