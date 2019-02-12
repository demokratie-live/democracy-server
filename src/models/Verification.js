import mongoose from 'mongoose';
import VerificationSchema from './../migrations/3-schemas/Verification';

export default mongoose.model('Verification', VerificationSchema);
