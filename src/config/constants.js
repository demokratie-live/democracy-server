export default {
  PORT: process.env.PORT || 3000,
  db: {
    development: {
      app: 'mongodb://localhost/democracy_development',
    },
    url: process.env.DB || 'mongodb://localhost/democracy_development',
  },
  GRAPHIQL_PATH: '/graphiql',
  GRAPHQL_PATH: '/graphql',
  BUNDESTAGIO_SERVER_URL: process.env.BUNDESTAGIO_SERVER_URL || 'http://localhost:3100/graphql',
};
