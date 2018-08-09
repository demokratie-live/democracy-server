import mm from 'mongodb-migrations';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('../../../mm.json'));
const migrator = new mm.Migrator(config);
console.log(process.argv[2]);
migrator.create('../', process.argv[2], (err) => {
  if (err) {
    console.log(err);
  }
  migrator.dispose();
});