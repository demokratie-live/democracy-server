import VoteSchema, { Vote } from '../migrations/2-schemas/Vote';
import { model } from 'mongoose';

export default model<Vote>('Vote', VoteSchema);
