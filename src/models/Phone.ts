import PhoneSchema, { Phone } from '../migrations/3-schemas/Phone';
import { model } from 'mongoose';

export default model<Phone>('Phone', PhoneSchema);
