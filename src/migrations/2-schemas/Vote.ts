/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { createSchema, Type, ExtractDoc, ExtractProps } from 'ts-mongoose';
import ProcedureSchema from '../11-schemas/Procedure';

const VoteSchema = createSchema({
  procedure: Type.ref(Type.objectId({ required: true })).to('Procedure', ProcedureSchema),
  state: Type.string({ enum: ['VOTING', 'COMPLETED'], required: true }),
  type: Type.string({ enum: ['Phone', 'Device'], required: true }),
  voters: Type.array().of({
    voter: Type.objectId(),
    _id: Type.boolean({ default: false }),
  }),
  votes: Type.object().of({
    general: Type.object().of({
      yes: Type.number({ default: 0 }),
      no: Type.number({ default: 0 }),
      abstain: Type.number({ default: 0 }),
    }),
    constituencies: Type.array().of(
      Type.object().of({
        constituency: { required: true },
        yes: Type.number({ default: 0 }),
        no: Type.number({ default: 0 }),
        abstain: Type.number({ default: 0 }),
        _id: false,
      }),
    ),
    cache: Type.object().of({
      yes: Type.number({ default: 0 }),
      no: Type.number({ default: 0 }),
      abstain: Type.number({ default: 0 }),
    }),
  }),
});

VoteSchema.index({ procedure: 1, state: 1, type: 1 }, { unique: true });
VoteSchema.index({ procedure: 1, type: 1, 'voters.voter': 1 }, { unique: true });
VoteSchema.index({ _id: 1, 'votes.constituencies.constituency': 1 }, { unique: true });

export type VoteDoc = ExtractDoc<typeof VoteSchema>;
export type VoteProps = ExtractProps<typeof VoteSchema>;

export default VoteSchema;
