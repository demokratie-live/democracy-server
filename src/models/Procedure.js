import mongoose from 'mongoose';
import ProcedureSchema from '../migrations/7-schemas/Procedure';

export default mongoose.model('Procedure', ProcedureSchema);
