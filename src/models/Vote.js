import mongoose from 'mongoose';
import VoteSchema from './../migrations/2-schemas/Vote';

export default mongoose.model('Vote', VoteSchema);
/*
mongoose.model('Vote').createIndexes(err => {
  if (err) {
    Log.error(JSON.stringify({ err }));
  }
});
*/
