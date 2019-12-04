/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import mongoose from 'mongoose';
import SearchTermSchema from '../migrations/3-schemas/SearchTerm';

export default mongoose.model('SearchTerm', SearchTermSchema);
