import mongoose, { Schema } from 'mongoose';

const DeviceSchema = new Schema(
  {
    deviceHash: { type: String, required: true, unique: true },
    pushTokens: [
      {
        token: String,
        os: String,
      },
    ],
    notificationSettings: {
      enabled: { type: Boolean, default: true },
      disableUntil: Date,
      newVote: { type: Boolean, default: true },
      newPreperation: { type: Boolean, default: false },
      procedures: [{ type: Schema.Types.ObjectId, ref: 'Procedure' }],
      tags: [],
    },
    verifications: [
      {
        newPhoneHash: { type: String, required: true },
        oldPhoneHash: String,
        code: { type: String, required: true },
        expires: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model('Device', DeviceSchema);
