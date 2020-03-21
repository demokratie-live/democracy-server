import { createSchema, Type } from 'ts-mongoose';

const PushNotificationSchema = createSchema(
  {
    procedureId: Type.string({ type: String, required: true }),
    type: Type.string({
      type: String,
      enum: ['new', 'newVote', 'update'],
      required: true,
    }),
    updatedValues: Type.array().of(Type.string()),
    status: Type.string({
      type: String,
      enum: ['new', 'running', 'complete'],
      default: 'new',
    }),
    sentTokens: Type.array().of(
      Type.object().of({
        token: Type.string({
          type: String,
          required: true,
        }),
        error: Type.string(),
      }),
    ),
  },
  { timestamps: true },
);

export default PushNotificationSchema;
