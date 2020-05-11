import DeputySchema, { IDeputy } from '../migrations/4-schemas/Deputy';
import { model } from 'mongoose';

export default model<IDeputy>('Deputy', DeputySchema);
