export default {
  PORT: process.env.PORT || 3000,
  db: {
    url: process.env.DB_URL || 'mongodb://localhost/democracy_development',
  },
  GRAPHIQL: process.env.GRAPHIQL === 'true',
  GRAPHIQL_PATH: '/graphiql',
  GRAPHQL_PATH: '/graphql',
  BUNDESTAGIO_SERVER_URL: process.env.BUNDESTAGIO_SERVER_URL || 'http://localhost:3100/graphql',
  NOTIFICATION_ANDROID_SERVER_KEY: process.env.NOTIFICATION_ANDROID_SERVER_KEY || null,
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'elasticsearch',
  APN_TOPIC: (() => {
    switch (process.env.STAGE) {
      case 'alpha':
        return 'de.democracy-deutschland.clientapp.alpha';
      case 'beta':
        return 'de.democracy-deutschland.clientapp.beta';
      case 'production':
        return 'de.democracy-deutschland.clientapp';
      default:
        console.error('ERROR: no STAGE defined!');
        return 'de.democracy-deutschland.clientapp';
    }
  })(),
  MIN_PERIOD: process.env.MIN_PERIOD || 19,
  DEBUG: process.env.DEBUG === 'true',
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || null,
  AUTH_JWT_TTL: process.env.AUTH_JWT_TTL || '1d',
  AUTH_JWT_REFRESH_TTL: process.env.AUTH_JWT_REFRESH_TTL || '7d',
  ENGINE_API_KEY: process.env.ENGINE_API_KEY || null,
  WHITELIST_DATA_SOURCES: process.env.WHITELIST_DATA_SOURCES ? process.env.WHITELIST_DATA_SOURCES.split(',') : ['::ffff:127.0.0.1', '::1'],
  SMS_VERIFICATION: !(process.env.SMS_VERIFICATION === 'false'),
  SMS_VERIFICATION_CODE_TTL: process.env.SMS_VERIFICATION_CODE_TTL || 600000,
  SMS_VERIFICATION_NEW_USER_DELAY: process.env.SMS_VERIFICATION_NEW_USER_DELAY || 15552000000,
  JWT_BACKWARD_COMPATIBILITY: process.env.JWT_BACKWARD_COMPATIBILITY === 'true',
};
