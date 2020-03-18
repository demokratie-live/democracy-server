/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import CONFIG from '../../config';

const createExpressResolver = resolver => {
  const baseResolver = resolver;
  baseResolver.createResolver = childResolver => {
    const newResolver = async (req, res) =>
      (await resolver(req, res)) ? childResolver(req, res) : null;
    return createExpressResolver(newResolver);
  };
  return baseResolver;
};

const createGraphQLResolver = resolver => {
  const baseResolver = resolver;
  baseResolver.createResolver = childResolver => {
    const newResolver = async (parent, args, context, info) => {
      await resolver(parent, args, context, info);
      return childResolver(parent, args, context, info);
    };
    return createGraphQLResolver(newResolver);
  };
  return baseResolver;
};

// User has Data Source flag (note: its not required to have an actual user for this)
export const isDataSource = createExpressResolver((req, res) => {
  if (
    !CONFIG.WHITELIST_DATA_SOURCES.some(
      address => address.length >= 3 && req.connection.remoteAddress.indexOf(address) !== -1,
    )
  ) {
    global.Log.warn('Permission denied: isDataSource = false');
    res.send({
      error: 'Permission denied',
      succeeded: false,
    });
    return false;
  }
  return true;
});

// User & Device is existent in Database
export const isLoggedin = createGraphQLResolver((parent, args, { user, device }) => {
  if (!user || !device) {
    global.Log.warn('Permission denied: You need to login with your Device');
    throw new Error('Permission Denied');
  }
});

// User has verified flag
export const isVerified = createGraphQLResolver((parent, args, { user, phone }) => {
  if (!user || (CONFIG.SMS_VERIFICATION && (!user.isVerified() || !phone))) {
    global.Log.warn('Permission denied: isVerified = false');
    throw new Error('Permission Denied');
  }
});
