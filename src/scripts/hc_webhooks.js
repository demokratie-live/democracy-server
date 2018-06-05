import { User, connect } from 'human-connection-api-nodejs-client';
import mongoose from 'mongoose';
import slugify from 'slugify';
import constants from '../config/constants';

export async function contributeProcedure(data) {
  connect(constants.HC_BACKEND_URL);
  const ProcedureModel = mongoose.model('Procedure');
  const { procedureId, email, password } = data || {};
  if (procedureId && email && password) {
    const procedure = await ProcedureModel.findOne({ procedureId });
    if (procedure) {
      const user = new User({ email, password });
      await user.contribute({
        title: procedure.title,
        content: `<p>${procedure.abstract}</p>`,
        contentExcerpt: procedure.abstract,
        type: 'post',
        language: 'de',
        categoryIds: ['5ac7768f8d655d2ee6d48fe4'], // politics & democracy
      }, {
        slug: slugify(procedure.title, { lower: true }),
      });
      return procedure;
    }
    throw Error('No procedure found.');
  } else {
    throw Error('Please provide procedureId, email and password.');
  }
}
export default contributeProcedure;
