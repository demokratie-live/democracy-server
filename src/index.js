/* eslint-disable no-console */

import express from 'express';
import bodyParser from 'body-parser';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import { createServer } from 'http';
import { Engine } from 'apollo-engine';

import './config/db';
import constants from './config/constants';
import typeDefs from './graphql/schemas';
import resolvers from './graphql/resolvers';

import importProcedures from './scripts/import';

// Models
import Procedure from './models/Procedure';
import getProcedureUpdates from './graphql/queries/getProcedureUpdates';
import client from './graphql/client';

const app = express();

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

if (process.env.ENGINE_API_KEY) {
  const engine = new Engine({
    engineConfig: { apiKey: process.env.ENGINE_API_KEY },
    graphqlPort: constants.PORT,
  });
  engine.start();
  app.use(engine.expressMiddleware());
}

app.use(bodyParser.json());

if (process.env.ENVIRONMENT !== 'production') {
  app.use(
    constants.GRAPHIQL_PATH,
    graphiqlExpress({
      endpointURL: constants.GRAPHQL_PATH,
    }),
  );
}

app.use(constants.GRAPHQL_PATH, (req, res, next) => {
  graphqlExpress({
    schema,
    context: {
      // Models
      Procedure,
    },
    tracing: true,
    cacheControl: true,
  })(req, res, next);
});

app.post('/webhooks/bundestagio/update', async (req, res) => {
  const { data } = req.body;
  try {
    // Count local Data in groups
    const groups = await Procedure.aggregate([{
      // Group by Period & Type
      $group: {
        _id: { period: '$period', type: '$type' },
        count: { $sum: 1 },
      },
    },
    {
      // Group by Period
      $group: {
        _id: '$_id.period',
        types: { $push: { type: '$_id.type', count: '$count' } },
      },
    },
    {
      // Rename _id Field to period
      $project: { _id: 0, period: '$_id', types: 1 },
    }]);

    const update = [];
    await Promise.all(data.map(async (d) => {
      const period = parseInt(d.period, 10);
      const { type, countBefore, changedIds } = d.types.find(t => t.type === 'Gesetzgebung');
      const localCount = groups.find(c => c.period === period).types.find(ct => ct.type === type).count;
      // Append Changed IDs
      update.concat(changedIds);
      // Compare Counts Remote & Local
      if (countBefore > localCount) {
        // Find remote Procedure Updates
        const { data: { procedureUpdates } } = await client.query({
          query: getProcedureUpdates,
          variables: { pageSize: 20, period, type },
        });
        // Find local Procedure Updates
        const localProcedureUpdates = await Procedure.find({ period, type }, { procedureId: 1, lastUpdateDate: 1 });
        // Compare
        procedureUpdates.map((pu) => {
          const localData = localProcedureUpdates.find(ld => ld.procedureId === pu.procedureId);
          if (!localData || new Date(localData.lastUpdateDate) < new Date(pu.updatedAt)) {
            update.push(pu.procedureId);
          }
          return null;
        });
      }
    }));
    // Update
    const updated = await importProcedures(update);
    res.send({
      updated,
      succeeded: true,
    });
    console.log(`Updated: ${updated}`);
  } catch (error) {
    res.send({
      error,
      succeeded: false,
    });
  }
});

const graphqlServer = createServer(app);

graphqlServer.listen(constants.PORT, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`App is listen on port: ${constants.PORT}`);
  }
});
