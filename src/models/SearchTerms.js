/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import mongoose, { Schema } from 'mongoose';

const SearchTermsSchema = new Schema(
  {
    term: { type: String, required: true, unique: true },
    times: [{ type: Date, required: true }],
  },
  { timestamps: false },
);

export default mongoose.model('SearchTerms', SearchTermsSchema);
