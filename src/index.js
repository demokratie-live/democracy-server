/* eslint-disable no-console */

import express from 'express';
import bodyParser from 'body-parser';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import { createServer } from 'http';
import { Engine } from 'apollo-engine';
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
  // Migrations
  await migrate().catch(err => {
    // Log the original error
    Log.error(err.stack);
    // throw own error
    throw new Error('Migration not successful - I die now!');
  });

  // Start regular DB Connection
  await DB();

  // Express Server
  const server = express();
  if (CONSTANTS.DEBUG) {
    server.use(cookieParser());
  }

  server.use(cors(corsOptions));

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Apollo Engine
  if (CONSTANTS.ENGINE_API_KEY) {
    const engine = new Engine({
      engineConfig: { apiKey: CONSTANTS.ENGINE_API_KEY },
      graphqlPort: CONSTANTS.PORT,
    });
    engine.start();
    server.use(engine.expressMiddleware());
  }

  server.use(bodyParser.json());

  // Authentification
  server.use(auth);

  // Graphiql
  if (CONSTANTS.GRAPHIQL) {
    server.use(
      CONSTANTS.GRAPHIQL_PATH,
      graphiqlExpress({
        endpointURL: CONSTANTS.GRAPHQL_PATH,
      }),
    );
  }

  // VOYAGER
  if (CONSTANTS.VOYAGER) {
    server.use('/voyager', voyagerMiddleware({ endpointUrl: CONSTANTS.GRAPHQL_PATH }));
  }

  // Bundestag.io
  // Webhook
  server.post('/webhooks/bundestagio/update', isDataSource.createResolver(BIOupdate));
  // Webhook update specific procedures
  server.post(
    '/webhooks/bundestagio/updateProcedures',
    isDataSource.createResolver(BIOupdateProcedures),
  );

  // Human Connection webhook
  server.get(
    '/webhooks/human-connection/contribute',
    isDataSource.createResolver(smHumanConnaction),
  );

  // Debug
  if (CONSTANTS.DEBUG) {
    // Push Notification test
    server.get('/push-test', debugPushNotifications);
    // Bundestag.io Import All
    server.get('/webhooks/bundestagio/import-all', debugImportAll);
  }

  // Graphql
  server.use(CONSTANTS.GRAPHQL_PATH, (req, res, next) => {
    graphqlExpress({
      schema,
      context: {
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
      },
      tracing: true,
      cacheControl: true,
    })(req, res, next);
  });

  const graphqlServer = createServer(server);
  graphqlServer.listen(CONSTANTS.PORT, err => {
    if (err) {
      Log.error(JSON.stringify({ err }));
    } else {
      Log.info(`App is listen on port: ${CONSTANTS.PORT}`);

      const cronjob = new CronJob('0 8 * * *', sendNotifications, null, true, 'Europe/Berlin');

      const cronjob2 = new CronJob('45 19 * * *', sendNotifications, null, true, 'Europe/Berlin');
      Log.info(
        JSON.stringify({
          cronjob: cronjob.running,
          cronjob2: cronjob2.running,
        }),
      );
    }
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
