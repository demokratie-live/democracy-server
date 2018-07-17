import mongoose, { Schema } from 'mongoose';

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
    return this.verified;
  },
};

UserSchema.index({ device: 1, phone: 1 }, { unique: true });

export default mongoose.model('User', UserSchema);
