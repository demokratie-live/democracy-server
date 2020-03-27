import { createSchema, Type } from 'ts-mongoose';

const DeputyLinkSchema = createSchema(
  {
    name: Type.string({ required: true }),
    URL: Type.string({ required: true }),
  },
  { _id: false },
);

export default DeputyLinkSchema;
