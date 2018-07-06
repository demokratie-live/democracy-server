import webhook from '../../../scripts/webhook';

export default async (req, res) => {
  const { data } = req.body;
  try {
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
