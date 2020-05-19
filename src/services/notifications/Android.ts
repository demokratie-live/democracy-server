import gcm, { IResponseBody } from 'node-gcm';
import gcmProvider from './AndroidProvicer';

export const push = async ({
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
  callback: (err: any, resJson: IResponseBody) => void;
}) => {
  // Check if Sending Interface is present
  if (!gcmProvider) {
    global.Log.error('ERROR: gcmProvider not present');
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

  gcmProvider.send(gcmMessage, token, callback);
};

// send bulk android notifications
export const pushBulk = ({
  title,
  message,
  payload,
  tokens,
}: {
  title: string;
  message: string;
  payload: string;
  tokens: string[];
}) => {
  // Check if Sending Interface is present
  if (!gcmProvider) {
    global.Log.error('ERROR: gcmProvider not present');
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
        global.Log.error(
          JSON.stringify({ type: 'gcmProvider.send', registrationTokens, err, response }),
        );
      } else {
        global.Log.info(JSON.stringify({ type: 'gcmProvider.send', response }));
      }
    });
  }
};
