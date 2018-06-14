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
      return await user.contribute({
        title: procedure.title,
        content: `${procedure.abstract}`,
        contentExcerpt: procedure.abstract,
        type: 'post',
        language: 'de',
      }, {
        slug: slugify(procedure.title, { lower: true }),
        resolveSlugs: {
          categories: ['democracy-politics'],
          organization: constants.HC_ORGANIZATION_SLUG,
        }
      });
    }
    throw Error('No procedure found.');
  } else {
    throw Error('Please provide procedureId, email and password.');
  }
}
export default contributeProcedure;
