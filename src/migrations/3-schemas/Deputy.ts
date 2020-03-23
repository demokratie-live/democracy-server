import { createSchema, Type } from 'ts-mongoose';
import DeputyContact from './Deputy/Contact';

const DeputySchema = createSchema(
  {
    webId: Type.string({ type: String, required: true, unique: true, index: true }),
    imgURL: Type.string({ type: String }),
    name: Type.string({ type: String }),
    party: Type.string({ type: String }),
    job: Type.string({ type: String }),
    biography: Type.string({ type: String }),
    constituency: Type.string({ type: String }),
    directCandidate: Type.boolean({ type: Boolean }),
    contact: Type.schema().of(DeputyContact),
  },
  { timestamps: true },
);

export default DeputySchema;
