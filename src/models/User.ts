import { typedModel } from 'ts-mongoose';
import UserSchema from '../migrations/1-schemas/User';

export default typedModel('User', UserSchema);
