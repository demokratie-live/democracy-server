import { ApolloServer, makeExecutableSchema } from 'apollo-server-express';
import { applyMiddleware } from 'graphql-middleware';
import CONFIG from '../../config';
import { ExpressReqContext } from '../../types/graphqlContext';

import typeDefs from '../../graphql/schemas';
import resolvers from '../../graphql/resolvers';
import { permissions } from '../../express/auth/permissions';

// Models
import ProcedureModel from '../../models/Procedure';
import UserModel from '../../models/User';
import DeviceModel from '../../models/Device';
import PhoneModel from '../../models/Phone';
import VerificationModel from '../../models/Verification';
import ActivityModel from '../../models/Activity';
import VoteModel from '../../models/Vote';
import PushNotificationModel from '../../models/PushNotification';
import SearchTermModel from '../../models/SearchTerm';
import DeputyModel from '../../models/Deputy';

const schema = makeExecutableSchema({ typeDefs, resolvers });

const graphql = new ApolloServer({
  uploads: false,
  engine: CONFIG.ENGINE_API_KEY
    ? {
        apiKey: CONFIG.ENGINE_API_KEY,
        // Send params and headers to engine
        privateVariables: !CONFIG.ENGINE_DEBUG_MODE,
        privateHeaders: !CONFIG.ENGINE_DEBUG_MODE,
      }
    : false,
  typeDefs,
  schema: applyMiddleware(schema, permissions),
  resolvers,
  introspection: true,
  playground: CONFIG.GRAPHIQL,
  context: ({ req, res }: { req: ExpressReqContext; res: Express.Response }) => ({
    // Connection
    res,
    // user
    userId: req.userId,
    deviceId: req.deviceId,
    phoneId: req.phoneId,
    // Models
    ProcedureModel,
    UserModel,
    DeviceModel,
    PhoneModel,
    VerificationModel,
    ActivityModel,
    VoteModel,
    PushNotificationModel,
    SearchTermModel,
    DeputyModel,
  }),
  tracing: CONFIG.DEBUG,
});

module.exports = graphql;
