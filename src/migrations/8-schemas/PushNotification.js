import { Schema } from 'mongoose';

export const PUSH_TYPE = {
  PROCEDURE: 'procedure',
  PROCEDURE_BULK: 'procedureBulk',
}

export const PUSH_CATEGORY = {
  CONFERENCE_WEEK: 'conferenceWeek',
  CONFERENCE_WEEK_VOTE: 'conferenceWeekVote',
  TOP100: 'top100',
  OUTCOME: 'outcome',
}

export const PUSH_OS = {
  IOS: 'ios',
  ANDROID: 'android'
}

const PushNotificationSchema = new Schema(
  {
    type: {
      type: String,
      enum: [PUSH_TYPE.PROCEDURE, PUSH_TYPE.PROCEDURE_BULK],
      required: true,
    },
    category: {
      type: String,
      enum: [PUSH_CATEGORY.CONFERENCE_WEEK, PUSH_CATEGORY.CONFERENCE_WEEK_VOTE, PUSH_CATEGORY.TOP100, PUSH_CATEGORY.OUTCOME],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    procedureIds: [String],
    token: {
      type: String,
      required: true,
    },
    os: {
      type: String,
      enum: [],
      required: true,
    },
    time: {
      type: Date,
      required: true,
    },
    sent: {
      type: Boolean,
      default: false,
    },
    failure: {
      type: String,
    }
  },
  { timestamps: true },
);

PushNotificationSchema.index({ category: -1 }, { background: true });
PushNotificationSchema.index({ token: -1 }, { background: true });
PushNotificationSchema.index({ time: -1 }, { background: true });
PushNotificationSchema.index({ sent: -1 }, { background: true });
PushNotificationSchema.index({ os: -1 }, { background: true });

export default PushNotificationSchema;
