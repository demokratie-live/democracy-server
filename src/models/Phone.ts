import { typedModel } from 'ts-mongoose';
import PhoneSchema from '../migrations/3-schemas/Phone';

export default typedModel('Phone', PhoneSchema);
