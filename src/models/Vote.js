import mongoose from 'mongoose';
import VoteSchema from '../migrations/2-schemas/Vote';

export default mongoose.model('Vote', VoteSchema);
