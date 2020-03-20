import { typedModel } from 'ts-mongoose';
import ProcedureSchema from '../migrations/11-schemas/Procedure';

export default typedModel('Procedure', ProcedureSchema);
