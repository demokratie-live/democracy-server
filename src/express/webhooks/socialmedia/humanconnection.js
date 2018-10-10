import { User, connect } from 'human-connection-api-nodejs-client';
import mongoose from 'mongoose';
import slugify from 'slugify';
import speakingurl from 'speakingurl';
import m from 'moment';
import _ from 'lodash';
import CONSTANTS from '../../../config/constants';
import { getImage } from './subjectGroupToIcon';

const formatDate = date => {
  if (date) {
    if (date <= new Date()) {
      return m(date).format('DD.MM.YY');
    }
    const daysDate = m(date).endOf('day');
    const days = Math.floor(m.duration(daysDate.diff(m())).asDays());

    if (days > 1) {
      return `${days} Tage`;
    } else if (days === 1) {
      return `morgen`;
    }

    const hours = Math.floor(m.duration(m(date).diff(m())).asMinutes() / 60);
    const minutes = _.padStart(
      `${Math.floor(((m.duration(m(date).diff(m())).asMinutes() / 60) % 1) * 60)}`,
      2,
      '0',
    );
    return `${hours}:${minutes}`;
  }
  return 'N/A';
};

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
          // <b>Inhalt</b>\n
          content: `${
            procedure.abstract
          }\n\n<b>Mehr dazu</b>:\n<a href="https://democracy-app.de/${procedure.type.toLowerCase()}/${
            procedure.procedureId
          }/${speakingurl(procedure.title)}">democracy-app.de/${procedure.type.toLowerCase()}/${
            procedure.procedureId
          }/${speakingurl(
            procedure.title,
          )}</a>\n\n<b>Sachgebiete</b>: ${procedure.subjectGroups.join(
            ', ',
          )}\n<b>Aktueller Stand</b>: ${procedure.currentStatus}\n<b>Typ</b>: ${
            procedure.type
          }\n<b>Vorgang</b>: ${procedure.procedureId}\n<b>Erstellt am</b>: ${formatDate(
            procedure.submissionDate,
          )}\n<b>Abstimmung</b>: ${formatDate(procedure.voteDate)}`,
          // contentExcerpt: `<b>Live aus dem Bundestag</b>: ${procedure.abstract}`,
          type: 'post',
          language: 'de',
          teaserImg: `https://democracy-app.de${getImage(procedure.subjectGroups[0])}_1920.jpg`,
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
