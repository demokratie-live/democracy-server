import apn from 'apn';

const options = {
  token: {
    key: process.env.APPLE_APN_KEY,
    keyId: process.env.APPLE_APN_KEY_ID,
    teamId: process.env.APPLE_TEAMID,
  },
  production: false,
};

const apnProvider = new apn.Provider(options);

const deviceToken = 'c6a966484866d2d274d4660e9e593ccbc35636894eb08e2b1fb4070396bcaad5';

const note = new apn.Notification();

note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
note.badge = 3;
note.sound = 'ping.aiff';
note.alert = '\uD83D\uDCE7 \u2709 You have a new message';
note.payload = { messageFrom: 'John Appleseed' };
note.topic = 'de.democracy-deutschland.clientapp';

export default apnProvider;

apnProvider.send(note, deviceToken).then((result) => {
  console.log('apnProvider.send', result);
});
