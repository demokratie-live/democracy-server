import mongoose from 'mongoose';
import ProcedureSchema from './../migrations/3-schemas/Procedure';

export default mongoose.model('Procedure', ProcedureSchema);

/*
mongoose.model('Procedure').createIndexes(err => {
  if (!err) {
    Log.info('SearchIndexs for Procedures created');
  } else {
    Log.error(JSON.stringify({ err }));
  }
});
*/
