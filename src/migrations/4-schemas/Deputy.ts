import { Schema, Document } from 'mongoose';
import DeputyContact, { IDeputyContact } from '../3-schemas/Deputy/Contact';
import DeputyVote, { IDeputyVote } from './Deputy/Vote';
import { Timestamps } from '../schemas/timestapms';

export interface IDeputy extends Document, Timestamps {
  webId: string;
  imgURL: string;
  name: string;
  party?: string | null;
  job?: string | null;
  biography?: string | null;
  constituency?: string | null;
  directCandidate?: boolean | null;
  contact?: IDeputyContact | null;
  votes: IDeputyVote[];
}

const DeputySchema = new Schema(
  {
    webId: { type: String, required: true, unique: true, index: true },
    imgURL: { type: String, required: true },
    name: { type: String, required: true },
    party: { type: String },
    job: { type: String },
    biography: { type: String },
    constituency: { type: String },
    directCandidate: { type: Boolean },
    contact: { type: DeputyContact },
    votes: [{ type: DeputyVote }],
  },
  { timestamps: true },
);

DeputySchema.index({ webId: 1, 'votes.procedureId': 1 }, { unique: true });

export default DeputySchema;
