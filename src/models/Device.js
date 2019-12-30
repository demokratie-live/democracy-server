import mongoose from 'mongoose';
import DeviceSchema from '../migrations/9-schemas/Device';

export default mongoose.model('Device', DeviceSchema);
