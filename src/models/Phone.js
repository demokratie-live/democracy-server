import mongoose from 'mongoose';
import PhoneSchema from './../migrations/3-schemas/Phone';

export default mongoose.model('Phone', PhoneSchema);
