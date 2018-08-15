/* eslint-disable no-console */
import mongoose from 'mongoose';
import { inspect } from 'util';

import CONSTANTS from './constants';

mongoose.Promise = global.Promise;

if (CONSTANTS.LOGGING.MONGO) {
  mongoose.set('debug', (...rest) => {
    Log[CONSTANTS.LOGGING.MONGO](inspect(rest));
  });
}
(async () => {
  try {
    mongoose.connect(CONSTANTS.db.url, {});
  } catch (err) {
    mongoose.createConnection(CONSTANTS.db.url, {});
  }

  mongoose.connection.once('open', () => Log.info('MongoDB is running')).on('error', (e) => {
    Log.error(JSON.stringify(e));
  });
})();

export default mongoose;
