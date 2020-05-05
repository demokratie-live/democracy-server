import { Schema, Document } from 'mongoose';
import { Timestamps } from '../schemas/timestapms';

export interface Phone extends Document, Timestamps {
  phoneHash: string;
}

const PhoneSchema = new Schema<Phone>(
  {
    phoneHash: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export default PhoneSchema;
