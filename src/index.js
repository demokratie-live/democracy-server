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
import auth from './express/auth';
import updateProcedures from './express/webhooks/bundestagio/updateProcedures';

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

// Apollo Engine
if (process.env.ENGINE_API_KEY) {
  const engine = new Engine({
    engineConfig: { apiKey: process.env.ENGINE_API_KEY },
    graphqlPort: constants.PORT,
  });
  engine.start();
  app.use(engine.expressMiddleware());
}

app.use(bodyParser.json());

// Authentification
auth(app);

// Graphiql
if (constants.GRAPHIQL) {
  app.use(
    constants.GRAPHIQL_PATH,
    graphiqlExpress({
      endpointURL: constants.GRAPHQL_PATH,
    }),
  );
}

// Graphql
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

// Bundestag.io Webhook
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

// Bundestag.io Webhook update specific procedures
app.post('/webhooks/bundestagio/updateProcedures', updateProcedures);

/* // Push Notification test
import pushNotify from './services/notifications';
app.get('/push-test', async (req, res) => {
  const { message } = req.query;
  const users = await UserModel.find();
  users.forEach((user) => {
    pushNotify({
      title: 'test',
      message: message || 'Test push notification to all users',
      user,
    });
  });
  res.send("push's send");
});
*/

/* // ImportAll Darf in Production nicht ausführbar sein!
import importAll from './scripts/importAll';
app.get('/webhooks/bundestagio/import-all', importAll);
*/

// Create & start Server
const graphqlServer = createServer(app);
graphqlServer.listen(constants.PORT, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`App is listen on port: ${constants.PORT}`);
  }
});
