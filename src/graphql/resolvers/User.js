/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import RSAKey from 'react-native-rsa';
import crypto from 'crypto';

import { createTokens, headerToken } from '../../express/auth';
/* import { isLoggedin } from '../../express/auth/permissions'; */
import CONSTANTS from '../../config/constants';

export default {
  Query: {
    me: /* isLoggedin.createResolver( */async (parent, args, { UserModel, user, device }) => {
      if (!user) {
        return null;
      }
      // Normal Code - remove stuff above and enable isLoggedin resolver
      // Maybe return user; ?
      const dbUser = await UserModel.findById(user._id);
      const { deviceHash } = device;
      return { ...dbUser.toObject(), deviceHash };
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
        deviceHash: crypto.createHash('sha256').update(deviceHash).digest('hex'),
      });
      if (!device) {
        device = await DeviceModel.create({
          deviceHash: crypto.createHash('sha256').update(deviceHash).digest('hex'),
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
