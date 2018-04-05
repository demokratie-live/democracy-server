export default {
  PORT: process.env.PORT || 3000,
  db: {
    url: process.env.DB_URL || 'mongodb://localhost/democracy_development',
  },
  GRAPHIQL_PATH: '/graphiql',
  GRAPHQL_PATH: '/graphql',
  BUNDESTAGIO_SERVER_URL: process.env.BUNDESTAGIO_SERVER_URL || 'http://localhost:3100/graphql',
  NOTIFICATION_ANDROID_SERVER_KEY: process.env.NOTIFICATION_ANDROID_SERVER_KEY || false,
};
