import mongoose from 'mongoose';
import ActivitySchema from './../migrations/1-schemas/Activity';

export default mongoose.model('Activity', ActivitySchema);
