import mongoose from 'mongoose';
import CronJobSchema from './../migrations/6-schemas/CronJob';

export default mongoose.model('CronJob', CronJobSchema);
