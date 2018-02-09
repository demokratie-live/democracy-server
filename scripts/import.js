import ProgressBar from 'cli-progress'; // eslint-disable-line
import program from 'commander'; // eslint-disable-line

import getConnections from '../src/config/db';

(async () => {
  const [app, bundestagIo] = await getConnections();
  const bIoProcedure = bundestagIo.model('Procedure');
  const Procedure = app.model('Procedure');
  await bIoProcedure.find({ type: 'Gesetzgebung' }).then((data) => {
    data.map(async (p, index) => {
      if (index === 0) {
        console.log(p.procedureId);
        console.log(p);
        // await Procedure.findOneAndUpdate(
        //   { procedureId: p.procedureId },
        //   { $set: { ...p } },
        //   { upsert: true },
        // );
      }
    });
  });

  console.log('finish');
  // mongoose.disconnect();
  // bIoDb.disconnect();
})();
