import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import fetch from 'node-fetch';

const client = new ApolloClient({
  link: new HttpLink({
    // ssrMode: true,
    uri: 'http://localhost:3100/graphql',
    fetch,
  }),
  cache: new InMemoryCache(),
});
export default client;
