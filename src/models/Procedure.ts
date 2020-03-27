import ProcedureSchema, { IProcedure } from '../migrations/11-schemas/Procedure';
import { model } from 'mongoose';

export default model<IProcedure>('Procedure', ProcedureSchema);
