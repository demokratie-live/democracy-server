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
    let update = [];
    Object.keys(data).map((objectKey) => {
      const value = data[objectKey].find(d => d.type === 'Gesetzgebung');
      update = update.concat(value.changedIds);
      return null;
    });
    let updated = await importProcedures(update);

    const counts = await Procedure.aggregate([{
      $group: {
        _id: {
          period: '$period',
          type: '$type',
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.period',
        types: {
          $push: {
            type: '$_id.type',
            count: '$count',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        period: '$_id',
        types: 1,
      },
    }]);
    const update2 = [];
    await Promise.all(Object.keys(data).map(async (objectKey) => {
      const { count } = data[objectKey].find(d => d.type === 'Gesetzgebung');
      const localCount = counts.find(d => d.period === parseInt(objectKey, 10)).types.find(d => d.type === 'Gesetzgebung').count;
      if (count > localCount) {
        const PAGE_SIZE = 20;
        const { data: { procedureUpdates } } = await client.query({
          query: getProcedureUpdates,
          variables: { pageSize: PAGE_SIZE, period: parseInt(objectKey, 10), type: 'Gesetzgebung' },
        });
        const localProcedureUpdates = await Procedure.find({ period: parseInt(objectKey, 10), type: 'Gesetzgebung' }, { procedureId: 1, lastUpdateDate: 1 });
        procedureUpdates.map((data2) => {
          const localData = localProcedureUpdates.find(d => d.procedureId === data2.procedureId);
          if (!localData || new Date(localData.lastUpdateDate) < new Date(data2.updatedAt)) {
            update2.push(data2.procedureId);
          }
          return null;
        });
      }
    }));
    updated += await importProcedures(update2);
    res.send({
      updated,
      succeeded: true,
    });
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
