import { Schema } from 'mongoose';
import DeputyContact from './Deputy/Contact';

const DeputySchema = new Schema(
  {
    webId: { type: String, required: true, unique: true, index: true },
    imgURL: { type: String },
    name: { type: String },
    party: { type: String },
    job: { type: String },
    biography: { type: String },
    constituency: { type: String },
    directCandidate: { type: Boolean },
    contact: { type: DeputyContact },
  },
  { timestamps: true },
);

export default DeputySchema;
