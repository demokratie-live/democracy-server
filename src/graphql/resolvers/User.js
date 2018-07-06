/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
// import RSAKey from 'react-native-rsa';

export default {
  Query: {
    me: (parent, args, { UserModel, user }) => {
      if (user) {
        return UserModel.findById(user._id);
      }
      return null;
    },
  },
};
