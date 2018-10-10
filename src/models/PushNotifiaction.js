/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import mongoose, { Schema } from 'mongoose';

const PushNotificationSchema = new Schema(
  {
    procedureId: { type: String, required: true },
    type: {
      type: String,
      enum: ['new', 'newVote', 'update'],
      required: true,
    },
    updatedValues: [String],
    status: {
      type: String,
      enum: ['new', 'running', 'complete'],
      default: 'new',
    },
    sentTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        error: String,
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model('PushNotification', PushNotificationSchema);
