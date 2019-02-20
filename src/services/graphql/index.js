import { ApolloServer } from 'apollo-server-express';
import CONFIG from './../../config';

import typeDefs from './../../graphql/schemas';
import resolvers from './../../graphql/resolvers';

// Models
import ProcedureModel from './../../models/Procedure';
import UserModel from './../../models/User';
import DeviceModel from './../../models/Device';
import PhoneModel from './../../models/Phone';
import VerificationModel from './../../models/Verification';
import ActivityModel from './../../models/Activity';
import VoteModel from './../../models/Vote';
import PushNotifiactionModel from './../../models/PushNotifiaction';
import SearchTermModel from './../../models/SearchTerm';
import DeputyModel from './../../models/Deputy';

const graphql = new ApolloServer({
  engine: CONFIG.ENGINE_API_KEY
    ? {
        apiKey: CONFIG.ENGINE_API_KEY,
        // Send params and headers to engine
        privateVariables: !CONFIG.ENGINE_DEBUG_MODE,
        privateHeaders: !CONFIG.ENGINE_DEBUG_MODE,
      }
    : false,
  typeDefs,
  resolvers,
  introspection: true,
  playground: false,
  context: ({ req, res }) => ({
    // Connection
    res,
    // user
    user: req.user,
    device: req.device,
    phone: req.phone,
    // Models
    ProcedureModel,
    UserModel,
    DeviceModel,
    PhoneModel,
    VerificationModel,
    ActivityModel,
    VoteModel,
    PushNotifiactionModel,
    SearchTermModel,
    DeputyModel,
  }),
  tracing: CONFIG.DEBUG,
});

module.exports = graphql;
