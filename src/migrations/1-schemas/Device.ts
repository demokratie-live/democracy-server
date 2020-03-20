import { Schema } from 'mongoose';
import { Type, createSchema } from 'ts-mongoose';
import ProcedureSchema from '../11-schemas/Procedure';

const DeviceSchema = createSchema(
  {
    deviceHash: Type.string({ type: String, required: true, unique: true }),
    pushTokens: Type.array().of(
      Type.object().of({
        token: Type.string(),
        os: Type.string(),
      }),
    ),
    notificationSettings: Type.object().of({
      enabled: Type.boolean({ type: Boolean, default: true }),
      disableUntil: Type.date(),
      newVote: Type.boolean({ type: Boolean, default: true }),
      newPreperation: Type.boolean({ type: Boolean, default: false }),
      procedures: Type.array({ required: true }).of(
        Type.ref(Type.objectId()).to('Procedure', ProcedureSchema),
      ),
      tags: Type.array().of(Type.string()),
    }),
  },
  { timestamps: true },
);

export default DeviceSchema;
