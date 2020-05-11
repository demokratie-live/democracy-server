import ActivitySchema, { Activity } from '../migrations/1-schemas/Activity';
import { model } from 'mongoose';

export default model<Activity>('Activity', ActivitySchema);
