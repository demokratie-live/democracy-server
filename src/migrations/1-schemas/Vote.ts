/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { createSchema, Type } from 'ts-mongoose';
import ProcedureSchema from '../11-schemas/Procedure';

const VoteSchema = createSchema({
  procedure: Type.ref(Type.objectId({ required: true })).to('Procedure', ProcedureSchema),
  state: Type.string({ enum: ['VOTING', 'COMPLETED'], required: true }),
  voters: Type.array().of({
    voter: Type.objectId(),
    _id: Type.boolean({ default: false }),
  }),
  voteResults: Type.object().of({
    device: Type.object().of({
      yes: Type.number({ default: 0 }),
      no: Type.number({ default: 0 }),
      abstination: Type.number({ default: 0 }),
    }),
    phone: Type.object().of({
      yes: Type.number({ default: 0 }),
      no: Type.number({ default: 0 }),
      abstination: Type.number({ default: 0 }),
    }),
  }),
});

VoteSchema.index({ procedure: 1, state: 1 }, { unique: true });

export default VoteSchema;
