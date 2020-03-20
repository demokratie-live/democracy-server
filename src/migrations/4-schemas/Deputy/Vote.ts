import { createSchema, Type } from 'ts-mongoose';

const DeputyVoteSchema = createSchema(
  {
    procedureId: Type.string({ required: true }),
    decision: Type.string({
      enum: ['YES', 'NO', 'ABSTINATION', 'NOTVOTED'],
      required: true,
    }),
  },
  { _id: false },
);

export default DeputyVoteSchema;
