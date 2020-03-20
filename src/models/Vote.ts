import { typedModel } from 'ts-mongoose';
import VoteSchema from '../migrations/2-schemas/Vote';

export default typedModel('Vote', VoteSchema);
