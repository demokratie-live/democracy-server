import { User, connect } from 'human-connection-api-nodejs-client';
import mongoose from 'mongoose';
import slugify from 'slugify';
import CONSTANTS from '../../../config/constants';
import { getImage } from './subjectGroupToIcon';

async function contributeProcedure({ procedureId, email, password }) {
  connect(CONSTANTS.HC_BACKEND_URL);
  const ProcedureModel = mongoose.model('Procedure');
  if (procedureId && email && password) {
    const procedure = await ProcedureModel.findOne({ procedureId });
    if (procedure) {
      const user = new User({ email, password });
      return user.contribute(
        {
          title: procedure.title,
          content: procedure.abstract,
          contentExcerpt: procedure.abstract,
          type: 'post',
          language: 'de',
          teaserImg: `https://www.democracy-app.de/static/images/sachgebiete/${getImage(
            procedure.subjectGroups[0],
          )}_1920.jpg`,
        },
        {
          slug: slugify(procedure.title, { lower: true }),
          resolveSlugs: {
            categories: ['democracy-politics'],
            // organization: CONSTANTS.HC_ORGANIZATION_SLUG,
          },
        },
      );
    }
    throw Error('No procedure found.');
  } else {
    throw Error('Please provide procedureId, email and password.');
  }
}

export default async (req, res) => {
  const procedures = ['230576']; // 236215
  procedures.map(async procedureId => {
    try {
      const procedure = await contributeProcedure({
        procedureId,
        email: CONSTANTS.HC_LOGIN_EMAIL,
        password: CONSTANTS.HC_LOGIN_PASSWORD,
      });
      Log.info(procedure);
      res.send({
        procedure,
        succeeded: true,
      });
      Log.warn(`Contributed: ${procedure}`);
    } catch (error) {
      Log.error(error.message);
      res.send({
        error: error.message,
        succeeded: false,
      });
    }
  });
};
