/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import RSAKey from 'react-native-rsa';
import bcrypt from 'bcrypt';

import { createTokens, headerToken } from '../../express/auth';
/* import { isLoggedin } from '../../express/auth/permissions'; */
import CONSTANTS from '../../config/constants';

export default {
  Query: {
    me: /* isLoggedin.createResolver( */(parent, args, { UserModel, user }) => {
      if (!user) {
        return null;
      }
      // Normal Code - remove stuff above and enable isLoggedin resolver
      // Maybe return user; ?
      return UserModel.findById(user._id);
    }/* ) */,
  },
  Mutation: {
    signUp: async (parent, { deviceHashEncrypted }, { res, UserModel, DeviceModel }) => {
      if (!CONSTANTS.JWT_BACKWARD_COMPATIBILITY) {
        return null;
      }
      const rsa = new RSAKey();

      rsa.setPrivateString(process.env.SECRET_KEY);
      const deviceHash = rsa.decrypt(deviceHashEncrypted);
      if (!deviceHash) {
        throw new Error('invalid deviceHash');
      }

      let device = await DeviceModel.findOne({
        deviceHash: bcrypt.hashSync(deviceHash, CONSTANTS.BCRYPT_SALT),
      });
      if (!device) {
        device = await DeviceModel.create({
          deviceHash: bcrypt.hashSync(deviceHash, CONSTANTS.BCRYPT_SALT),
        });
      }

      let user = await UserModel.findOne({ device });
      if (!user) {
        user = await UserModel.create({ device });
      }

      const [token, refreshToken] = await createTokens(user._id);
      headerToken({ res, token, refreshToken });
      return { token };
    },
  },
};
