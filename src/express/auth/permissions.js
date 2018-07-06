/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import constants from '../../config/constants';

const createExpressResolver = (resolver) => {
  const baseResolver = resolver;
  baseResolver.createResolver = (childResolver) => {
    const newResolver = async (req, res) =>
      (await resolver(req, res) ? childResolver(req, res) : null);
    return createExpressResolver(newResolver);
  };
  return baseResolver;
};

const createGraphQLResolver = (resolver) => {
  const baseResolver = resolver;
  baseResolver.createResolver = (childResolver) => {
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
  if (!req.user || !req.user.isDataSource) {
    console.log('Permission denied: isDataSource = false');
    res.send({
      error: 'Permission denied',
      succeeded: false,
    });
    return false;
  }
  return true;
});

// User is existent in Database (note: this is the case if there was an device id transmitted)
export const isUser = createGraphQLResolver((parent, args, context) => {
  if (!context.user || !context.user._id) {
    console.log('Permission denied: You need to login with your Device');
    throw new Error('Permission Denied');
  }
});

// User has verified flag
export const isVerified = createGraphQLResolver((parent, args, context) => {
  if (constants.SMS_VERIFICATION && (!context.user || !context.user.verified)) {
    console.log('Permission denied: isVerified = false');
    throw new Error('Permission Denied');
  }
});
