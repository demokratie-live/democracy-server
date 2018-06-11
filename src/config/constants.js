export default {
  PORT: process.env.PORT || 3000,
  db: {
    url: process.env.DB_URL || 'mongodb://localhost/democracy_development',
  },
  GRAPHIQL: process.env.GRAPHIQL || false,
  GRAPHIQL_PATH: '/graphiql',
  GRAPHQL_PATH: '/graphql',
  BUNDESTAGIO_SERVER_URL: process.env.BUNDESTAGIO_SERVER_URL || 'http://localhost:3100/graphql',
  NOTIFICATION_ANDROID_SERVER_KEY: process.env.NOTIFICATION_ANDROID_SERVER_KEY || false,
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
};
