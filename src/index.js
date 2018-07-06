/* eslint-disable no-console */

import express from 'express';
import bodyParser from 'body-parser';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import { createServer } from 'http';
import { Engine } from 'apollo-engine';
import { CronJob } from 'cron';
import cookieParser from 'cookie-parser';

import './config/db';
import constants from './config/constants';
import typeDefs from './graphql/schemas';
import resolvers from './graphql/resolvers';

import sendNotifications from './scripts/sendNotifications';

import auth from './express/auth';
import BIOupdate from './express/webhooks/bundestagio/update';
import BIOupdateProcedures from './express/webhooks/bundestagio/updateProcedures';
import debugPushNotifications from './express/webhooks/debug/pushNotifications';
import debugImportAll from './express/webhooks/debug/importAll';

// Models
import ProcedureModel from './models/Procedure';
import UserModel from './models/User';
import ActivityModel from './models/Activity';
import VoteModel from './models/Vote';
import PushNotifiactionModel from './models/PushNotifiaction';
import SearchTermModel from './models/SearchTerms';
import { isDataSource } from './express/auth/permissions';

const app = express();
if (constants.DEBUG) {
  app.use(cookieParser());
}

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Apollo Engine
if (constants.ENGINE_API_KEY) {
  const engine = new Engine({
    engineConfig: { apiKey: constants.ENGINE_API_KEY },
    graphqlPort: constants.PORT,
  });
  engine.start();
  app.use(engine.expressMiddleware());
}

app.use(bodyParser.json());

// Authentification
app.use(auth);

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
      PushNotifiactionModel,
      SearchTermModel,
    },
    tracing: true,
    cacheControl: true,
  })(req, res, next);
});

// Bundestag.io
// Webhook
app.post('/webhooks/bundestagio/update', isDataSource.createResolver(BIOupdate));
// Webhook update specific procedures
app.post('/webhooks/bundestagio/updateProcedures', isDataSource.createResolver(BIOupdateProcedures));

// Debug
if (constants.DEBUG) {
  // Push Notification test
  app.get('/push-test', debugPushNotifications);
  app.get('/webhooks/bundestagio/import-all', debugImportAll);
}

const graphqlServer = createServer(app);
graphqlServer.listen(constants.PORT, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`App is listen on port: ${constants.PORT}`);

    const cronjob = new CronJob('0 8 * * *', sendNotifications, null, true, 'Europe/Berlin');

    const cronjob2 = new CronJob('45 19 * * *', sendNotifications, null, true, 'Europe/Berlin');
    console.log('cronjob.running', cronjob.running, cronjob2.running);
  }
});
