/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { Schema } from 'mongoose';

const VoteSchema = new Schema({
  procedure: {
    type: Schema.Types.ObjectId,
    ref: 'Procedure',
    required: true,
  },
  state: { type: String, enum: ['VOTING', 'COMPLETED'], required: true },
  type: { type: String, enum: ['Phone', 'Device'], required: true },
  voters: [{ voter: { type: Schema.Types.ObjectId, refPath: 'type' }, _id: false }],
  votes: {
    general: {
      yes: { type: Number, default: 0 },
      no: { type: Number, default: 0 },
      abstain: { type: Number, default: 0 },
    },
    constituencies: [
      {
        constituency: { type: String, required: true },
        yes: { type: Number, default: 0 },
        no: { type: Number, default: 0 },
        abstain: { type: Number, default: 0 },
        _id: false,
      },
    ],
    cache: {
      yes: { type: Number, default: 0 },
      no: { type: Number, default: 0 },
      abstain: { type: Number, default: 0 },
    },
  },
});

VoteSchema.index({ procedure: 1, state: 1, type: 1 }, { unique: true });
VoteSchema.index({ procedure: 1, type: 1, 'voters.voter': 1 }, { unique: true });
VoteSchema.index({ _id: 1, 'votes.constituencies.constituency': 1 }, { unique: true });

export default VoteSchema;
