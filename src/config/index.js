/*
  THIS FILE AND ALL IMPORTS ARE NOT ALLOWED TO INCLUDE ANY MONGOOSE MODELS
  See index.js for more info
*/

import jwt from './jwt';
import smsverification from './smsverification';
import humanconnection from './humanconnection';

const requiredConfigs = {
  // No default Values
  ...smsverification,
  ...jwt,
};

const recommendedConfigs = {
  // No correct default Values
  PORT: process.env.PORT || 3000,
  MIN_PERIOD: parseInt(process.env.MIN_PERIOD, 10) || 19,
  GRAPHQL_PATH: process.env.GRAPHQL_PATH || '/',
  // GRAPHIQL: process.env.GRAPHIQL === 'true',
  GRAPHIQL_PATH: process.env.GRAPHIQL_PATH || false,
  DB_URL: process.env.DB_URL || 'mongodb://localhost/democracy_development',
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'elasticsearch',
  BUNDESTAGIO_SERVER_URL: process.env.BUNDESTAGIO_SERVER_URL || 'http://localhost:3100/',
  APN_TOPIC: (() => {
    switch (process.env.STAGE) {
      case 'internal':
        return 'de.democracy-deutschland.clientapp.internal';
      case 'alpha':
        return 'de.democracy-deutschland.clientapp.alpha';
      case 'beta':
        return 'de.democracy-deutschland.clientapp.beta';
      case 'production':
        return 'de.democracy-deutschland.clientapp';
      default:
        console.error('ERROR: no STAGE defined!'); // eslint-disable-line no-console
        return 'de.democracy-deutschland.clientapp';
    }
  })(),
  NOTIFICATION_ANDROID_SERVER_KEY: process.env.NOTIFICATION_ANDROID_SERVER_KEY || null,
  APPLE_APN_KEY: process.env.APPLE_APN_KEY || null,
  APPLE_APN_KEY_ID: process.env.APPLE_APN_KEY_ID || null,
  APPLE_TEAMID: process.env.APPLE_TEAMID || null,
  WHITELIST_DATA_SOURCES: process.env.WHITELIST_DATA_SOURCES
    ? process.env.WHITELIST_DATA_SOURCES.split(',')
    : ['::ffff:127.0.0.1', '::1'],
  ...humanconnection,
};

const optionalConfigs = {
  // Default Values given
  DEBUG: process.env.DEBUG === 'true',
  ENGINE_API_KEY: process.env.ENGINE_API_KEY || null,
  ENGINE_DEBUG_MODE: process.env.ENGINE_DEBUG_MODE === 'true',
  VOYAGER: process.env.VOYAGER || false,
  // Logging
  LOGGING_CONSOLE: process.env.LOGGING_CONSOLE || false,
  LOGGING_FILE: process.env.LOGGING_FILE || false,
  LOGGING_DISCORD: process.env.LOGGING_DISCORD || false,
  LOGGING_DISCORD_WEBHOOK: process.env.LOGGING_DISCORD_WEBHOOK || false,
  LOGGING_MONGO: process.env.LOGGING_MONGO || false,
};

export default {
  ...requiredConfigs,
  ...recommendedConfigs,
  ...optionalConfigs,
};
