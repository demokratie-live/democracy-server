import { model } from 'mongoose';
import CronJobSchema from '../migrations/10-schemas/CronJob';

export default model('CronJob', CronJobSchema);
