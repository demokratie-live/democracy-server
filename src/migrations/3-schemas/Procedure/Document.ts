import { createSchema, Type } from 'ts-mongoose';

export interface IDocument extends Document {
  editor?: string;
  number?: string;
  type?: string;
  url?: string;
}

const DocumentSchema = createSchema(
  {
    editor: Type.string(),
    number: Type.string({ index: true }),
    type: Type.string(),
    url: Type.string(),
  },
  { _id: false },
);

export default DocumentSchema;
