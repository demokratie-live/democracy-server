import { Schema } from 'mongoose';
import { createSchema, Type } from 'ts-mongoose';

const DeputyLinkSchema = createSchema(
  {
    name: Type.string(),
    URL: Type.string(),
  },
  { _id: false },
);

export default DeputyLinkSchema;
