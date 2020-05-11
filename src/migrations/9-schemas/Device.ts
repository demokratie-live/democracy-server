import { Schema, Document } from 'mongoose';
import { Timestamps } from '../schemas/timestapms';
import { IProcedure } from '../11-schemas/Procedure';
import { Types } from 'mongoose';

export interface Device extends Document, Timestamps {
  deviceHash: string;
  pushTokens: {
    token: string;
    os: string;
  }[];
  notificationSettings: {
    enabled: boolean;
    disableUntil: Date;
    newVote: boolean; // TODO remove
    newPreperation: boolean; // TODO remove
    conferenceWeekPushs: boolean;
    voteConferenceWeekPushs: boolean;
    voteTOP100Pushs: boolean;
    procedures: (IProcedure | Types.ObjectId)[];
    tags: string[];
  };
}

const DeviceSchema = new Schema<Device>(
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
