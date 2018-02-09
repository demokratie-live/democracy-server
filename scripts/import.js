import ProgressBar from 'cli-progress'; // eslint-disable-line
import program from 'commander'; // eslint-disable-line

import mongoose from '../src/config/db';
import Procedure from '../src/models/Procedure';

(async () => {
  console.log(await Procedure.find());
  await mongoose.disconnect();
  // bIoDb.disconnect();
})();
