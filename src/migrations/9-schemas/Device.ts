import { Schema } from 'mongoose';
import { createSchema, Type } from 'ts-mongoose';
import ProcedureSchema from '../11-schemas/Procedure';

const DeviceSchema = createSchema(
  {
    deviceHash: Type.string({ required: true, unique: true }),
    pushTokens: Type.array().of({
      token: Type.string({ required: true }),
      os: Type.string({ required: true }),
    }),
    notificationSettings: Type.object().of({
      enabled: Type.boolean({ default: true }),
      disableUntil: Type.date(),
      newVote: Type.boolean({ default: true }), // TODO remove
      newPreperation: Type.boolean({ default: false }), // TODO remove
      conferenceWeekPushs: Type.boolean({ default: true }),
      voteConferenceWeekPushs: Type.boolean({ default: true }),
      voteTOP100Pushs: Type.boolean({ default: true }),
      procedures: Type.array().of(Type.ref(Type.objectId()).to('Procedure', ProcedureSchema)),
      tags: Type.array().of(Type.string()),
    }),
  },
  { timestamps: true },
);

export default DeviceSchema;
