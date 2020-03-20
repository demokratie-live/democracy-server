import { typedModel } from 'ts-mongoose';
import DeviceSchema from '../migrations/12-schemas/Device';

export default typedModel('Device', DeviceSchema);
