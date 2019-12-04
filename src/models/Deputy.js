import mongoose from 'mongoose';
import DeputySchema from '../migrations/4-schemas/Deputy';

export default mongoose.model('Deputy', DeputySchema);
