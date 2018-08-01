import mongoose, { Schema } from 'mongoose';

const VerificationSchema = new Schema(
  {
    phoneHash: { type: String, required: true, unique: true },
    verifications: [
      {
        deviceHash: String,
        oldPhoneHash: String,
        codes: [
          {
            code: { type: String, required: true },
            time: { type: Date, required: true },
            SMSID: { type: String, default: null },
          },
        ],
        SMSStatus: { type: Number },
        expires: { type: Date, required: true },

      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model('Verification', VerificationSchema);
