import { Schema } from 'mongoose';

const SearchTermSchema = new Schema(
  {
    term: { type: String, required: true, unique: true },
    times: [{ type: Date, required: true }],
  },
  { timestamps: false },
);

export default SearchTermSchema;
