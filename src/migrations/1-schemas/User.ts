import CONFIG from '../../config';
import { Schema, Document } from 'mongoose';
import { Phone } from '../3-schemas/Phone';
import { Device } from '../12-schemas/Device';
import { Timestamps } from '../schemas/timestapms';

export interface User extends Document, Timestamps {
  device?: Device | string | null;
  phone?: Phone | string | null;
  verified: boolean;

  // methods
  isVerified: () => boolean;
}

const UserSchema = new Schema<User>(
  {
    device: { type: Schema.Types.ObjectId, ref: 'Device' },
    phone: { type: Schema.Types.ObjectId, ref: 'Phone' },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

UserSchema.methods.isVerified = function() {
  // This assumes that a user can only be created with a device id
  // therefor all users are verfied if SMS_VERIFICATIOn is disabled
  return CONFIG.SMS_VERIFICATION ? this.verified : true;
};

UserSchema.index({ device: 1, phone: 1 }, { unique: true });

export default UserSchema;
