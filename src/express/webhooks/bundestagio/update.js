import webhook from '../../../scripts/webhook';

export default async (req, res) => {
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
