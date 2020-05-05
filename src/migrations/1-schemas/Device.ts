import { Schema } from 'mongoose';

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
  },
  { timestamps: true },
);

export default DeviceSchema;
