/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import mongoose, { Schema } from 'mongoose';

const VoteSchema = new Schema({
  procedure: {
    type: Schema.Types.ObjectId,
    ref: 'Procedure',
    required: true,
    index: { unique: true },
  },
  users: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  voteResults: {
    yes: { type: Number, default: 0 },
    no: { type: Number, default: 0 },
    abstination: { type: Number, default: 0 },
  },
});

export default mongoose.model('Vote', VoteSchema);
