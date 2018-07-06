import importProcedures from '../../../scripts/import';

export default async (req, res) => {
  console.log('BIO Update Procedures');
  try {
    const { data: { procedureIds } } = req.body;
    const updated = await importProcedures(procedureIds);
    console.log(`Updated Agenda: ${updated}`);
    res.send({
      updated,
      succeeded: true,
    });
  } catch (error) {
    console.log(error);
    res.send({
      error,
      succeeded: false,
    });
  }
};
