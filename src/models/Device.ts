import DeviceSchema, { Device } from '../migrations/12-schemas/Device';
import { model } from 'mongoose';

export default model<Device>('Device', DeviceSchema);
