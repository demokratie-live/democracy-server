import _ from 'lodash';

const createResolver = (resolver) => {
  const baseResolver = resolver;
  baseResolver.createResolver = (childResolver) => {
    const newResolver = async (parent, args, context, info) => {
      await resolver(parent, args, context, info);
      return childResolver(parent, args, context, info);
    };
    return createResolver(newResolver);
  };
  return baseResolver;
};

export const requiresAuth = createResolver((parent, args, context) => {
  if (!context.user) {
    throw new Error('Not authenticated');
  }
});

export const requiresVerified = requiresAuth.createResolver((parent, args, context) => {
  if (!context.user.verified) {
    throw new Error('Requires admin access');
  }
});
