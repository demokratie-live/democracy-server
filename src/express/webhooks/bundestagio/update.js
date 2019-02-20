/**
 * /webhooks/bundestagio/update
 */

import webhook from '../../../scripts/webhook';
import { isDataSource } from './../../auth/permissions';

const update = async (req, res) => {
  Log.import('Bundestag.io authenticated: Update');
  try {
    const { data } = req.body;
    const updated = await webhook(data);
    res.send({
      updated,
      succeeded: true,
    });
    Log.import(`Updated: ${updated}`);
  } catch (error) {
    Log.error(JSON.stringify({ error }));
    res.send({
      error,
      succeeded: false,
    });
  }
};

module.exports = isDataSource.createResolver(update);
