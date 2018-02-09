export default {
  PORT: process.env.PORT || 3000,
  db: {
    development: {
      app: 'mongodb://localhost/democracy_development',
      bundestagIo: 'mongodb://localhost/bundestagio',
    },
  },
  GRAPHIQL_PATH: '/graphiql',
  GRAPHQL_PATH: '/graphql',
};
