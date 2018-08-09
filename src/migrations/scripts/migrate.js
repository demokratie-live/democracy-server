import mm from 'mongodb-migrations';
import fs from 'fs';

export default async () => {
  const config = await fs.readFile('../../mm.json');
  const migrator = new mm.Migrator(config);
  migrator.runFromDir('../migrations');
}
