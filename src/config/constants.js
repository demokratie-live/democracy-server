export default {
  PORT: process.env.PORT || 3000,
  db: {
    development: {
      app: 'mongodb://localhost/democracy_development',
    },
  },
  GRAPHIQL_PATH: '/graphiql',
  GRAPHQL_PATH: '/graphql',
};
