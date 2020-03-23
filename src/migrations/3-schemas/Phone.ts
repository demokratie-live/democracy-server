import { createSchema, Type, ExtractDoc, ExtractProps } from 'ts-mongoose';

const PhoneSchema = createSchema(
  {
    phoneHash: Type.string({ required: true, unique: true }),
  },
  { timestamps: true },
);

export type PhoneDoc = ExtractDoc<typeof PhoneSchema>;
export type PhoneProps = ExtractProps<typeof PhoneSchema>;

export default PhoneSchema;
