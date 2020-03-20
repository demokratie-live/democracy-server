import { model } from 'mongoose';
import CronJobSchema, { ICronJob } from '../migrations/10-schemas/CronJob';

export default model<ICronJob>('CronJob', CronJobSchema);
