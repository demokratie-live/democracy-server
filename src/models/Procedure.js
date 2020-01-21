import mongoose from 'mongoose';
import ProcedureSchema from '../migrations/11-schemas/Procedure';

export default mongoose.model('Procedure', ProcedureSchema);
