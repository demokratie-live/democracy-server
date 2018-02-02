import ProgressBar from 'cli-progress'; // eslint-disable-line
import program from 'commander'; // eslint-disable-line
import fs from 'fs';
import _ from 'lodash';
import path from 'path';

import mongoose from '../src/config/db';

import Procedure from '../src/models/Procedure';

program.option('-p, --path  [type]', 'Path of dir with json files').parse(process.argv);

const files = fs.readdirSync(program.path);

function parseDate(input) {
  const parts = input.match(/(\d+)/g);
  // note parts[1]-1
  return new Date(Date.UTC(parts[2], parts[1] - 1, parts[0]));
}

// const jsonAnalyse = files.reduce((keys, file) => {
//   const filePath = `${program.path}/${file}`;
//   const procedure = JSON.parse(fs.readFileSync(filePath, 'utf8'));
//   const toAnalyse = procedure.VORGANGSABLAUF.VORGANGSPOSITION;
//   if (_.isArray(toAnalyse)) {
//     toAnalyse.forEach((ele) => {
//       const objKeys = _.keys(ele);
//       objKeys.forEach((key) => {
//         if (!keys[key]) {
//           keys[key] = { types: new Set() };
//         }
//         keys[key].types.add(typeof ele[key]);
//       });
//       return keys;
//     });
//     return keys;
//   }
//   const objKeys = _.keys(toAnalyse);
//   objKeys.forEach((key) => {
//     if (!keys[key]) {
//       keys[key] = { types: new Set() };
//     }
//     keys[key].types.add(typeof toAnalyse[key]);
//   });
//   return keys;
// }, {});
// console.log('jsonAnalyse', jsonAnalyse);

const procedures = files.map(async (file) => {
  const filePath = `${program.path}/${file}`;
  if (path.extname(filePath) === '.json') {
    const procedure = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const process = _.isArray(procedure.VORGANGSABLAUF.VORGANGSPOSITION)
      ? procedure.VORGANGSABLAUF.VORGANGSPOSITION
      : [procedure.VORGANGSABLAUF.VORGANGSPOSITION];

    const history = process.map((e) => {
      const flow = {
        procedureId: procedure.vorgangId.trim(),
        assignment: e.ZUORDNUNG.trim(),
        initiator: e.URHEBER.trim(),
        findSpot: e.FUNDSTELLE.trim(),
        findSpotUrl: e.FUNDSTELLE_LINK.trim(),
        date: parseDate(e.FUNDSTELLE.substr(0, 10)),
      };
      if (e.BESCHLUSS) {
        flow.decision = e.BESCHLUSS;
        flow.decisionTenor = e.BESCHLUSS.BESCHLUSSTENOR;
      }
      return flow;
    });

    const procedureObj = {
      procedureId: procedure.vorgangId || undefined,
      type: procedure.VORGANG.VORGANGSTYP || undefined,
      period: procedure.VORGANG.WAHLPERIODE || undefined,
      title: procedure.VORGANG.TITEL || undefined,
      currentStatus: procedure.VORGANG.AKTUELLER_STAND || undefined,
      signature: procedure.VORGANG.SIGNATUR || undefined,
      gestOrderNumber: procedure.VORGANG.GESTA_ORDNUNGSNUMMER || undefined,
      approvalRequired: procedure.VORGANG.ZUSTIMMUNGSBEDUERFTIGKEIT || undefined,
      euDocNr: procedure.VORGANG.EU_DOK_NR || undefined,
      abstract: procedure.VORGANG.ABSTRAKT || undefined,
      promulgation: procedure.VORGANG.VERKUENDUNG || undefined,
      legalValidity: procedure.VORGANG.INKRAFTTRETEN || undefined,
      tags: procedure.VORGANG.SCHLAGWORT || undefined,
      history,
    };
    return Procedure.findOneAndUpdate(
      {
        procedureId: procedureObj.procedureId,
      },
      _.pickBy(procedureObj),
      {
        upsert: true,
      },
    ).catch((err) => {
      console.log('##ERROR', err);
      console.log('##ERROR', procedureObj.procedureId);
      console.log('##ERROR', procedureObj.title);
    });
  }
  return undefined;
});

Promise.all(procedures)
  .then(() => {
    console.log('finish');

    console.log(procedures.length);

    mongoose.disconnect();
  })
  .catch(err => console.log(err));
