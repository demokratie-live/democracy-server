import { createSchema, Type } from 'ts-mongoose';

const PhoneSchema = createSchema(
  {
    phoneHash: Type.string({ required: true, unique: true }),
  },
  { timestamps: true },
);

export default PhoneSchema;
