import { createSchema, Type } from 'ts-mongoose';
import DeputyLink from './Link';

const DeputyContactSchema = createSchema(
  {
    address: Type.string(),
    email: Type.string(),
    links: Type.array({ required: true }).of(DeputyLink),
  },
  { _id: false },
);

export default DeputyContactSchema;
