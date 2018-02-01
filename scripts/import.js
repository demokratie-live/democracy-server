import ProgressBar from 'cli-progress'; // eslint-disable-line
import program from 'commander'; // eslint-disable-line
import fs from 'fs';
import _ from 'lodash';
import path from 'path';

import mongoose from '../src/config/db';

import Procedure from '../src/models/Procedure';

program.option('-p, --path  [type]', 'Path of dir with json files').parse(process.argv);

const files = fs.readdirSync(program.path);

// const jsonAnalyse = files.reduce((keys, file) => {
//   const filePath = `${program.path}/${file}`;
//   const procedure = JSON.parse(fs.readFileSync(filePath, 'utf8'));
//   const objKeys = _.keys(procedure.VORGANG);
//   objKeys.forEach((key) => {
//     if (!keys[key]) {
//       keys[key] = { types: new Set() };
//     }
//     keys[key].types.add(typeof procedure.VORGANG[key]);
//   });
//   return keys;
// }, {});
// console.log(jsonAnalyse);

let procedures = files.map((file) => {
  const filePath = `${program.path}/${file}`;
  if (path.extname(filePath) === '.json') {
    const procedure = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      procedureId: procedure.vorgangId,
      type: procedure.VORGANG.VORGANGSTYP,
      period: procedure.VORGANG.WAHLPERIODE,
      title: procedure.VORGANG.TITEL,
      currentStatus: procedure.VORGANG.AKTUELLER_STAND,
      signature: procedure.VORGANG.SIGNATUR,
      gestOrderNumber: procedure.VORGANG.GESTA_ORDNUNGSNUMMER,
      approvalRequired: procedure.VORGANG.ZUSTIMMUNGSBEDUERFTIGKEIT,
      euDocNr: procedure.VORGANG.EU_DOK_NR,
      abstract: procedure.VORGANG.ABSTRAKT,
      promulgation: procedure.VORGANG.VERKUENDUNG,
      legalValidity: procedure.VORGANG.INKRAFTTRETEN,
    };
  }
  return undefined;
});
procedures = _.compact(procedures);

const promises = procedures.map(async procedure =>
  Procedure.findOneAndUpdate(
    {
      procedureId: procedure.procedureId,
    },
    procedure,
    {
      upsert: true,
    },
  ).catch(err => console.log(err)));

Promise.all(promises)
  .then(() => {
    console.log('finish');

    console.log(procedures.length);

    mongoose.disconnect();
  })
  .catch(err => console.log(err));
