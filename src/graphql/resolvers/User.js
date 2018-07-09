/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import RSAKey from 'react-native-rsa';

import { createTokens, headerToken } from '../../express/auth';
/* import { isUser } from '../../express/auth/permissions'; */
import CONSTANTS from '../../config/constants';

export default {
  Query: {
    me: /* isUser.createResolver( */(parent, args, { UserModel, user }) => {
      if (!user) {
        return null;
      }
      // Normal Code - remove stuff above and enable isUser resolver
      return UserModel.findById(user._id);
    }/* ) */,
  },
  Mutation: {
    signUp: async (parent, { deviceHashEncrypted }, { res, UserModel }) => {
      if (!CONSTANTS.JWT_BACKWARD_COMPATIBILITY) {
        return null;
      }
      const rsa = new RSAKey();

      rsa.setPrivateString(process.env.SECRET_KEY);
      const deviceHash = rsa.decrypt(deviceHashEncrypted);
      if (!deviceHash) {
        throw new Error('invalid deviceHash');
      }
      let user;
      user = await UserModel.findOne({ deviceHash });
      if (!user) {
        user = await UserModel.create({ deviceHash });
      }

      const [token, refreshToken] = await createTokens(user._id);
      headerToken({ res, token, refreshToken });
      return { token };
    },

    signIn: async (parent, { deviceHashEncrypted }, { res, UserModel }) => {
      if (!CONSTANTS.JWT_BACKWARD_COMPATIBILITY) {
        return null;
      }
      const user = await UserModel.findOne({ deviceHashEncrypted });
      if (!user) {
        throw new Error('User does not exsit!');
      }

      const [token, refreshToken] = await createTokens(user._id);
      headerToken(res, token, refreshToken);
      return { token };
    },
  },
};
