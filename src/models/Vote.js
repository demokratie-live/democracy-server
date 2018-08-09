/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import mongoose, { Schema } from 'mongoose';

const VoteSchema = new Schema({
  procedure: {
    type: Schema.Types.ObjectId,
    ref: 'Procedure',
    required: true,
  },
  state: { type: String, enum: ['VOTING', 'COMPLETED'], required: true },
  voters: [{
    kind: String,
    voter: { type: Schema.Types.ObjectId, refPath: 'voters.kind' },
  }],
  voteResults: {
    yes: { type: Number, default: 0 },
    no: { type: Number, default: 0 },
    abstination: { type: Number, default: 0 },
  },
});

VoteSchema.index({ procedure: 1, state: 1 }, { unique: true });

export default mongoose.model('Vote', VoteSchema);
