import mongoose, { Schema } from 'mongoose';

const PhoneSchema = new Schema(
  {
    phoneHash: { type: String, required: true, unique: true },
    verifications: [
      {
        deviceHash: String,
        oldPhoneHash: String,
        code: { type: String, required: true },
        expires: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model('Phone', PhoneSchema);
