import mongoose, { Schema } from 'mongoose';
import DeputyContact from './Schemas/DeputyContact';

const DeputySchema = new Schema(
  {
    webId: { type: String },
    imgURL: { type: String },
    name: { type: String },
    party: { type: String },
    job: { type: String },
    biography: { type: String },
    constituency: { type: String },
    contact: { type: DeputyContact },
  },
  { timestamps: true },
);

export default mongoose.model('Deputy', DeputySchema);
