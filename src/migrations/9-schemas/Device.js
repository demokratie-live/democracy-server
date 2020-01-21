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
      newVote: { type: Boolean, default: true }, // TODO remove
      newPreperation: { type: Boolean, default: false }, // TODO remove
      conferenceWeekPushs: { type: Boolean, default: true },
      voteConferenceWeekPushs: { type: Boolean, default: true },
      voteTOP100Pushs: { type: Boolean, default: true },
      procedures: [{ type: Schema.Types.ObjectId, ref: 'Procedure' }],
      tags: [],
    },
  },
  { timestamps: true },
);

export default DeviceSchema;
