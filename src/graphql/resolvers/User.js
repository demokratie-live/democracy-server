/* eslint-disable no-underscore-dangle */
import RSAKey from 'react-native-rsa';

export default {
  Query: {
    me: (parent, args, { UserModel, user }) => {
      if (user) {
        return UserModel.findById(user._id);
      }
      return null;
    },
  },

  Mutation: {
    signUp: async (parent, { deviceHashEncrypted }, { UserModel }) => {
      const rsa = new RSAKey();

      rsa.setPrivateString(process.env.SECRET_KEY);
      const deviceHash = rsa.decrypt(deviceHashEncrypted);
      if (!deviceHash) {
        throw new Error('invalid deviceHash');
      }
      const user = await UserModel.create({ deviceHash });

      return { token: user.createToken() };
    },

    signIn: async (parent, { deviceHashEncrypted }, { UserModel }) => {
      const user = await UserModel.findOne({ deviceHashEncrypted });
      if (!user) {
        throw new Error('User does not exsit!');
      }

      return { token: user.createToken() };
    },
  },
};
