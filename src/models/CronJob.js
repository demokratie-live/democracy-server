import mongoose from 'mongoose';
import CronJobSchema from '../migrations/10-schemas/CronJob';

export default mongoose.model('CronJob', CronJobSchema);
