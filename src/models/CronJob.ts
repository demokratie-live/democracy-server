import CronJobSchema, { ICronJob } from '../migrations/10-schemas/CronJob';
import { model } from 'mongoose';

export default model<ICronJob>('CronJob', CronJobSchema);
