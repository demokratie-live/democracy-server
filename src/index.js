/* eslint-disable no-console */

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';

// *****************************************************************
// IMPORTANT - you cannot include any models before migrating the DB
// *****************************************************************

import CONFIG from './config';

// Allow global Log
import './services/logger';

import connectDB from './services/mongoose';
import migrateDB from './services/migration';

const main = async () => {
  // Connect to DB - this keeps the process running
  // IMPORTANT - This is done before any Model is registered
  await connectDB();

  // Migrate DB if required - can exit the process
  // IMPORTANT - you cannot include any models before finishing this
  //   else every schema including an index will be created in the database
  //   even tho is is quite retarded it is the way it is
  await migrateDB();

  // Express Server
  const server = express();

  if (process.env.EXPRESS_STATUS === 'true') {
    server.use(require('express-status-monitor')()); // eslint-disable-line global-require
  }

  // Cors
  server.use(cors(/* corsOptions */));
  /*
  const corsOptions = {
    origin: '*',
    // credentials: true, // <-- REQUIRED backend setting
  };
  */

  // Bodyparser
  server.use(bodyParser.json());

  // Cookie parser to debug JWT easily
  if (CONFIG.DEBUG) {
    server.use(cookieParser());
  }

  // Authentification
  // Here several Models are included
  const { auth } = require('./express/auth'); // eslint-disable-line global-require
  server.use(auth);

  // VOYAGER
  if (CONFIG.VOYAGER) {
    server.use('/voyager', voyagerMiddleware({ endpointUrl: CONFIG.GRAPHQL_PATH }));
  }

  // Graphiql Playground
  // Here several Models are included for graphql
  // This must be registered before graphql since it binds on / (default)
  if (CONFIG.GRAPHIQL_PATH) {
    const graphiql = require('./services/graphiql'); // eslint-disable-line global-require
    graphiql.applyMiddleware({ app: server, path: CONFIG.GRAPHIQL_PATH });
  }

  // Bundestag.io
  // Webhook
  const BIOupdate = require('./express/webhooks/bundestagio/update'); // eslint-disable-line global-require
  server.post('/webhooks/bundestagio/update', BIOupdate);

  // Webhook update specific procedures
  const BIOupdateProcedures = require('./express/webhooks/bundestagio/updateProcedures'); // eslint-disable-line global-require
  server.post('/webhooks/bundestagio/updateProcedures', BIOupdateProcedures);

  // Human Connection webhook
  const smHumanConnection = require('./express/webhooks/socialmedia/humanconnection'); // eslint-disable-line global-require
  server.get('/webhooks/human-connection/contribute', smHumanConnection);

  // Debug
  if (CONFIG.DEBUG) {
    const debugPushNotifications = require('./express/webhooks/debug/pushNotifications'); // eslint-disable-line global-require
    // Push Notification test
    server.get('/push-test', debugPushNotifications);
    // Bundestag.io Import All
    const debugImportAll = require('./express/webhooks/debug/importAll'); // eslint-disable-line global-require
    server.get('/webhooks/bundestagio/import-all', debugImportAll);
  }

  // Graphql
  // Here several Models are included for graphql
  const graphql = require('./services/graphql'); // eslint-disable-line global-require
  graphql.applyMiddleware({ app: server, path: CONFIG.GRAPHQL_PATH });

  // Start Server
  server.listen({ port: CONFIG.PORT }, err => {
    if (err) {
      Log.error(err);
    } else {
      Log.warn(`🚀 Server ready at http://localhost:${CONFIG.PORT}${CONFIG.GRAPHQL_PATH}`);
    }
  });

  // Start CronJobs (Bundestag Importer)
  // Serveral Models are included
  const cronJobs = require('./services/cronJobs'); // eslint-disable-line global-require
  cronJobs();
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
