import webhook from '../../../scripts/webhook';

export default async (req, res) => {
  console.log('Bundestag.io authenticated: Update');
  try {
    const { data } = req.body;
    const updated = await webhook(data);
    res.send({
      updated,
      succeeded: true,
    });
    console.log(`Updated: ${updated}`);
  } catch (error) {
    console.log(error);
    res.send({
      error,
      succeeded: false,
    });
  }
};
