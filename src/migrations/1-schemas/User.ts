import { Type, createSchema } from 'ts-mongoose';
import CONFIG from '../../config';
import DeviceSchema from '../12-schemas/Device';
import PhoneSchema from '../3-schemas/Phone';

const UserSchema = createSchema(
  {
    // device: Type.schema({ required: true }).of(DeviceSchema),
    device: Type.ref(Type.objectId()).to('Device', DeviceSchema),
    phone: Type.ref(Type.objectId()).to('Phone', PhoneSchema),

    verified: Type.boolean({ default: false }),
  },
  { timestamps: true },
);

UserSchema.methods = {
  isVerified() {
    // This assumes that a user can only be created with a device id
    // therefor all users are verfied if SMS_VERIFICATIOn is disabled
    return CONFIG.SMS_VERIFICATION ? this.verified : true;
  },
};

UserSchema.index({ device: 1, phone: 1 }, { unique: true });

export default UserSchema;
