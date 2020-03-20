import mongoose from 'mongoose';
import VerificationSchema, { IVerification } from '../migrations/3-schemas/Verification';

export default mongoose.model<IVerification>('Verification', VerificationSchema);
