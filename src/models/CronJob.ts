import { typedModel } from 'ts-mongoose';
import CronJobSchema from '../migrations/10-schemas/CronJob';

export default typedModel('CronJob', CronJobSchema);
