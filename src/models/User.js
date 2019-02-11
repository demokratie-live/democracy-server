import mongoose, { Schema } from 'mongoose';
import CONFIG from './../config';

const UserSchema = new Schema(
  {
    device: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },
    phone: {
      type: Schema.Types.ObjectId,
      ref: 'Phone',
      default: null,
    },
    verified: { type: Boolean, default: false },
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

export default mongoose.model('User', UserSchema);
