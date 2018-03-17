/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import mongoose, { Schema } from 'mongoose';

const ActivitySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    procedure: { type: Schema.Types.ObjectId, ref: 'Procedure', required: true },
  },
  { timestamps: false },
);

export default mongoose.model('Activity', ActivitySchema);
