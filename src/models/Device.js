import mongoose from 'mongoose';
import DeviceSchema from './../migrations/1-schemas/Device';

export default mongoose.model('Device', DeviceSchema);
