import { mongoose } from '@democracy-deutschland/democracy-common';

/*
  THIS FILE AND ALL IMPORTS ARE NOT ALLOWED TO INCLUDE ANY MONGOOSE MODELS
  See index.js for more info
*/
import CONFIG from '../../config';

export default async () => {
  // Mongo Debug
  if (CONFIG.LOGGING_MONGO) {
    mongoose.set('debug', () => {
      // global.Log[CONFIG.LOGGING_MONGO](inspect(true));
    });
  }

  // Connect
  try {
    await mongoose.connect(CONFIG.DB_URL, { useNewUrlParser: true, reconnectTries: 86400 });
  } catch (err) {
    global.Log.error(err);
    await mongoose.createConnection(CONFIG.DB_URL, {});
  }

  // Open
  mongoose.connection
    .once('open', () => global.Log.info('MongoDB is running'))
    .on('error', (e) => {
      // Unknown if this ends up in main - therefore we log here
      global.Log.error(e.stack);
      throw e;
    });
};
