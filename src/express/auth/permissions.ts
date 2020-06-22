/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import { rule, shield } from 'graphql-shield';
import CONFIG from '../../config';

// User & Device is existent in Database
export const isLoggedin = rule({ cache: 'no_cache' })(async (parent, args, { user, device }) => {
  if (!user || !device) {
    global.Log.warn('Permission denied: You need to login with your Device');
    return false;
  }
  return true;
});

export const isVerified = rule({ cache: 'no_cache' })(async (parent, args, { user, phone }) => {
  if (!user || (CONFIG.SMS_VERIFICATION && (!user.isVerified() || !phone))) {
    global.Log.warn('Permission denied: isVerified = false');
    return false;
  }
  return true;
});

export const permissions = shield(
  {
    Query: {
      // procedures: isLoggedin,
      // activityIndex: isLoggedin,
      notificationSettings: isLoggedin,
      notifiedProcedures: isLoggedin,
      votes: isLoggedin,
      votedProcedures: isVerified,
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
