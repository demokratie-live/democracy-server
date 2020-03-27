import UserSchema, { User } from '../migrations/1-schemas/User';
import { model } from 'mongoose';

export default model<User>('User', UserSchema);
