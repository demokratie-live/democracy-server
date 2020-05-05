import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import fetch from 'node-fetch';
import CONFIG from '../config';

const createClient = () =>
  new ApolloClient({
    link: new HttpLink({
      // ssrMode: true,
      uri: CONFIG.BUNDESTAGIO_SERVER_URL,
      fetch,
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: 'no-cache',
      },
    },
  });
export default createClient;
