import { Schema } from 'mongoose';

const DeputyLinkSchema = new Schema(
  {
    name: { type: String },
    URL: { type: String },
  },
  { _id: false },
);

export default DeputyLinkSchema;
