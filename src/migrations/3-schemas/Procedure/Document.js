import { Schema } from 'mongoose';

const DocumentSchema = new Schema(
  {
    editor: String,
    number: { type: String, index: true },
    type: String,
    url: String,
  },
  { _id: false },
);

export default DocumentSchema;
