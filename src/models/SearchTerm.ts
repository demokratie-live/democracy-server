/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { typedModel } from 'ts-mongoose';
import SearchTermSchema from '../migrations/3-schemas/SearchTerm';

export default typedModel('SearchTerm', SearchTermSchema);
