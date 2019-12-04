import { Schema } from 'mongoose';
import DeputyContact from '../3-schemas/Deputy/Contact';
import DeputyVote from './Deputy/Vote';

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
    votes: [DeputyVote],
  },
  { timestamps: true },
);

DeputySchema.index({ webId: 1, 'votes.procedureId': 1 }, { unique: true });

export default DeputySchema;
