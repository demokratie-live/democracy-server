/* eslint-disable no-console */

import express from 'express';
import bodyParser from 'body-parser';
import { ApolloServer } from 'apollo-server-express';
import { CronJob } from 'cron';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';

import './services/logger';

import DB from './config/db';
import CONSTANTS from './config/constants';
import typeDefs from './graphql/schemas';
import resolvers from './graphql/resolvers';

import sendNotifications from './scripts/sendNotifications';

import { auth } from './express/auth';
import BIOupdate from './express/webhooks/bundestagio/update';
import BIOupdateProcedures from './express/webhooks/bundestagio/updateProcedures';
import debugPushNotifications from './express/webhooks/debug/pushNotifications';
import debugImportAll from './express/webhooks/debug/importAll';
import smHumanConnaction from './express/webhooks/socialmedia/humanconnection';
import importDeputyProfiles from './importer/importDeputyProfiles';

// Models
import ProcedureModel from './models/Procedure';
import UserModel from './models/User';
import DeviceModel from './models/Device';
import PhoneModel from './models/Phone';
import VerificationModel from './models/Verification';
import ActivityModel from './models/Activity';
import VoteModel from './models/Vote';
import PushNotifiactionModel from './models/PushNotifiaction';
import SearchTermModel from './models/SearchTerms';
import { isDataSource } from './express/auth/permissions';
import { migrate } from './migrations/scripts';

// enable cors
const corsOptions = {
  origin: '*',
  // credentials: true, // <-- REQUIRED backend setting
};

const main = async () => {
  // Start regular DB Connection
  await DB();

  // Migrations
  await migrate().catch(err => {
    // Log the original error
    Log.error(err.stack);
    // throw own error
    throw new Error('Migration not successful - I die now!');
  });

  // Express Server
  const server = express();
  if (CONSTANTS.DEBUG) {
    server.use(cookieParser());
  }

  server.use(cors(corsOptions));

  // Authentification
  server.use(auth);

  // VOYAGER
  if (CONSTANTS.VOYAGER) {
    server.use('/voyager', voyagerMiddleware({ endpointUrl: CONSTANTS.GRAPHQL_PATH }));
  }
  // Bundestag.io
  // Webhook
  server.post(
    '/webhooks/bundestagio/update',
    bodyParser.json(),
    isDataSource.createResolver(BIOupdate),
  );
  // Webhook update specific procedures
  server.post(
    '/webhooks/bundestagio/updateProcedures',
    bodyParser.json(),
    isDataSource.createResolver(BIOupdateProcedures),
  );

  // Human Connection webhook
  server.get(
    '/webhooks/human-connection/contribute',
    bodyParser.json(),
    isDataSource.createResolver(smHumanConnaction),
  );

  // Debug
  if (CONSTANTS.DEBUG) {
    // Push Notification test
    server.get('/push-test', bodyParser.json(), debugPushNotifications);
    // Bundestag.io Import All
    server.get('/webhooks/bundestagio/import-all', bodyParser.json(), debugImportAll);
  }

  // Graphql
  console.log({ typeDefs, resolvers });
  const graphQlServer = new ApolloServer({
    engine: CONSTANTS.ENGINE_API_KEY
      ? {
          apiKey: CONSTANTS.ENGINE_API_KEY,
          // Send params and headers to engine
          privateVariables: !CONSTANTS.ENGINE_DEBUG_MODE,
          privateHeaders: !CONSTANTS.ENGINE_DEBUG_MODE,
        }
      : false,
    typeDefs,
    resolvers,
    playground: CONSTANTS.GRAPHIQL
      ? {
          endpoint: CONSTANTS.GRAPHQL_PATH,
        }
      : false,
    context: ({ req, res }) => ({
      // Connection
      res,
      // User, Device & Phone
      user: req.user,
      device: req.device,
      phone: req.phone,
      // Models
      ProcedureModel,
      UserModel,
      DeviceModel,
      PhoneModel,
      VerificationModel,
      ActivityModel,
      VoteModel,
      PushNotifiactionModel,
      SearchTermModel,
    }),
    tracing: CONSTANTS.DEBUG,
  });

  graphQlServer.applyMiddleware({
    app: server,
    path: CONSTANTS.GRAPHQL_PATH,
  });

  server.listen({ port: CONSTANTS.PORT }, () => {
    const crons = [
      new CronJob('0 8 * * *', sendNotifications, null, true, 'Europe/Berlin'),
      new CronJob('45 19 * * *', sendNotifications, null, true, 'Europe/Berlin'),
      new CronJob('*/15 * * * *', importDeputyProfiles, null, true, 'Europe/Berlin', null, true),
    ];

    if (CONSTANTS.DEBUG) {
      Log.info('crons', crons.length);
    }

    console.log(`🚀 Server ready at http://localhost:${CONSTANTS.PORT}${CONSTANTS.GRAPHQL_PATH}`);
  });
};

// Async Wrapping Function
// Catches all errors
(async () => {
  try {
    await main();
  } catch (error) {
    Log.error(error.stack);
  }
})();
