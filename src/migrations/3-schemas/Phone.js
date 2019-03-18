import { Schema } from 'mongoose';

const PhoneSchema = new Schema(
  {
    phoneHash: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export default PhoneSchema;
