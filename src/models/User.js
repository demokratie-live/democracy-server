/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    deviceHash: { type: String, required: true },
    phoneHash: { type: String, default: null },
    verified: { type: Boolean, default: false },
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
  },
  { timestamps: true },
);

UserSchema.index({ deviceHash: 1, phoneHash: 1 }, { unique: true });

export default mongoose.model('User', UserSchema);
