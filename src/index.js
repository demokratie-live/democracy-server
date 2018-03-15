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

import webhook from './scripts/webhook';

// Models
import ProcedureModel from './models/Procedure';

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
      ProcedureModel,
    },
    tracing: true,
    cacheControl: true,
  })(req, res, next);
});

app.post('/webhooks/bundestagio/update', async (req, res) => {
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
});

const graphqlServer = createServer(app);

graphqlServer.listen(constants.PORT, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`App is listen on port: ${constants.PORT}`);
  }
});
