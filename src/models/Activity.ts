import { typedModel } from 'ts-mongoose';
import ActivitySchema from '../migrations/1-schemas/Activity';

export default typedModel('Activity', ActivitySchema);
