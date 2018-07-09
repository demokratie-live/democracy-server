/* eslint-disable no-console */
import mongoose from 'mongoose';

import CONSTANTS from './constants';

mongoose.Promise = global.Promise;

if (CONSTANTS.DEBUG) {
  mongoose.set('debug', true);
}
(async () => {
  try {
    mongoose.connect(CONSTANTS.db.url, {});
  } catch (err) {
    mongoose.createConnection(CONSTANTS.db.url, {});
  }

  mongoose.connection.once('open', () => console.log('MongoDB is running')).on('error', (e) => {
    throw e;
  });
})();

export default mongoose;
