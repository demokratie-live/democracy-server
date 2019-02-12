import mongoose from 'mongoose';
import DeputySchema from './../migrations/3-schemas/Deputy';

export default mongoose.model('Deputy', DeputySchema);
