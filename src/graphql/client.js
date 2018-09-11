import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import fetch from 'node-fetch';
import CONSTANTS from '../config/constants';

const createClient = () =>
  new ApolloClient({
    link: new HttpLink({
      // ssrMode: true,
      uri: CONSTANTS.BUNDESTAGIO_SERVER_URL,
      fetch,
    }),
    cache: new InMemoryCache(),
  });
export default createClient;
