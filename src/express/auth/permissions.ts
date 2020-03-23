/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { rule, shield } from 'graphql-shield';
import CONFIG from '../../config';

// const createExpressResolver = <T>(resolver: T) => {
//   const baseResolver = resolver;
//   baseResolver.createResolver = childResolver => {
//     const newResolver = async (req, res) =>
//       (await resolver(req, res)) ? childResolver(req, res) : null;
//     return createExpressResolver(newResolver);
//   };
//   return baseResolver;
// };

// // User has Data Source flag (note: its not required to have an actual user for this)
// export const isDataSource = createExpressResolver((req, res) => {
//   if (
//     !CONFIG.WHITELIST_DATA_SOURCES.some(
//       address => address.length >= 3 && req.connection.remoteAddress.indexOf(address) !== -1,
//     )
//   ) {
//     global.Log.warn('Permission denied: isDataSource = false');
//     res.send({
//       error: 'Permission denied',
//       succeeded: false,
//     });
//     return false;
//   }
//   return true;
// });

// User & Device is existent in Database
export const isLoggedin = rule({ cache: 'no_cache' })(
  async (parent, args, { user, device }, info) => {
    if (!user || !device) {
      global.Log.warn('Permission denied: You need to login with your Device');
      return false;
    }
    return true;
  },
);

export const isVerified = rule({ cache: 'no_cache' })(
  async (parent, args, { user, phone }, info) => {
    if (!user || (CONFIG.SMS_VERIFICATION && (!user.isVerified() || !phone))) {
      global.Log.warn('Permission denied: isVerified = false');
      return false;
    }
    return true;
  },
);

export const permissions = shield(
  {
    Query: {
      procedures: isLoggedin,
      activityIndex: isLoggedin,
      notificationSettings: isLoggedin,
      notifiedProcedures: isLoggedin,
      votes: isLoggedin,
    },
    Mutation: {
      increaseActivity: isVerified,
      vote: isVerified,
      requestCode: isLoggedin,
      requestVerification: isLoggedin,
      addToken: isLoggedin,
      updateNotificationSettings: isLoggedin,
      toggleNotification: isLoggedin,
      finishSearch: isLoggedin,
      // createResolver: isLoggedin,
    },
  },
  {
    debug: true,
  },
);
