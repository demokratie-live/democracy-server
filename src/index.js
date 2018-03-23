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
// import importAll from './scripts/importAll';

import auth from './express/auth';

// Models
import ProcedureModel from './models/Procedure';
import UserModel from './models/User';
import ActivityModel from './models/Activity';
import VoteModel from './models/Vote';

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

auth(app);

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
      user: req.user,
      // Models
      ProcedureModel,
      UserModel,
      ActivityModel,
      VoteModel,
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

// Darf in Production nicht ausführbar sein!
// app.get('/webhooks/bundestagio/import-all', importAll);

const graphqlServer = createServer(app);

graphqlServer.listen(constants.PORT, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`App is listen on port: ${constants.PORT}`);
  }
});
