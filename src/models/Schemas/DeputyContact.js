import { Schema } from 'mongoose';
import DeputyLink from './DeputyLink';

const DeputyContactSchema = new Schema(
  {
    address: { type: String },
    email: { type: String },
    links: [{ type: DeputyLink }],
  },
  { _id: false },
);

export default DeputyContactSchema;
