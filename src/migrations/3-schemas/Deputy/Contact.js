import { Schema } from 'mongoose';
import DeputyLink from './Link';

const DeputyContactSchema = new Schema(
  {
    address: { type: String },
    email: { type: String },
    links: [{ type: DeputyLink }],
  },
  { _id: false },
);

export default DeputyContactSchema;
