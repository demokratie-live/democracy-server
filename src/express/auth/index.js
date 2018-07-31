/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import CONSTANTS from '../../config/constants';
import UserModel from '../../models/User';
import DeviceModel from '../../models/Device';
import PhoneModel from '../../models/Phone';

export const createTokens = async (user) => {
  const token = jwt.sign(
    {
      user,
    },
    CONSTANTS.AUTH_JWT_SECRET,
    {
      expiresIn: CONSTANTS.AUTH_JWT_TTL,
    },
  );

  const refreshToken = jwt.sign(
    {
      user,
    },
    CONSTANTS.AUTH_JWT_SECRET,
    {
      expiresIn: CONSTANTS.AUTH_JWT_REFRESH_TTL,
    },
  );

  return Promise.all([token, refreshToken]);
};

const refreshTokens = async (refreshToken) => {
  // Verify Token
  try {
    jwt.verify(refreshToken, CONSTANTS.AUTH_JWT_SECRET);
  } catch (err) {
    return {};
  }
  // Decode Token
  let userid = null;
  try {
    userid = jwt.decode(refreshToken).user;
  } catch (err) {
    return {};
  }
  // Validate UserData if an old User was set
  const user = await UserModel.findOne({ _id: userid });

  if (!user) {
    return {};
  }
  console.log(`JWT: Token Refresh for User: ${user._id}`);
  // Generate new Tokens
  const [newToken, newRefreshToken] = await createTokens(user._id);
  return {
    token: newToken,
    refreshToken: newRefreshToken,
    user,
  };
};

export const headerToken = async ({ res, token, refreshToken }) => {
  res.set('Access-Control-Expose-Headers', 'x-token, x-refresh-token');
  res.set('x-token', token);
  res.set('x-refresh-token', refreshToken);

  if (CONSTANTS.DEBUG) {
    res.cookie('debugToken', token, { maxAge: 900000, httpOnly: true });
    res.cookie('debugRefreshToken', refreshToken, { maxAge: 900000, httpOnly: true });
  }
};

export const auth = async (req, res, next) => {
  console.log(`Server: Connection from: ${req.connection.remoteAddress}`);
  const token = req.headers['x-token'] || (CONSTANTS.DEBUG ? req.cookies.debugToken : null);
  const deviceHash = req.headers['x-device-hash'] || (CONSTANTS.DEBUG ? req.query.deviceHash || null : null);
  const phoneHash = req.headers['x-phone-hash'] || (CONSTANTS.DEBUG ? req.query.phoneHash || null : null);
  if (deviceHash || phoneHash) {
    console.log(`JWT: Credentials with DeviceHash(${deviceHash}) PhoneHash(${phoneHash})`);
  }

  let success = false;
  // Check existing JWT Session
  // If Credentials are also present use them instead
  if (token && !deviceHash) {
    console.log(`JWT: Token: ${token}`);
    try {
      const userid = jwt.verify(token, CONSTANTS.AUTH_JWT_SECRET).user;
      // Set request variables
      req.user = await UserModel.findOne({ _id: userid });
      if (req.user) {
        req.device = req.user.device ? await DeviceModel.findOne({ _id: req.user.device }) : null;
        req.phone = req.user.phone ? await PhoneModel.findOne({ _id: req.user.phone }) : null;
        // Set new timestamps
        req.user.markModified('updatedAt');
        req.user.save();
        if (req.device) {
          req.device.markModified('updatedAt');
          req.device.save();
        }
        if (req.phone) {
          req.phone.markModified('updatedAt');
          req.phone.save();
        }
      }
      success = true;
      console.log(`JWT: Token valid: ${token}`);
    } catch (err) {
      // Check for JWT Refresh Ability
      console.log(`JWT: Token Error: ${err}`);
      const refreshToken = req.headers['x-refresh-token'] || (CONSTANTS.DEBUG ? req.cookies.debugRefreshToken : null);
      const newTokens = await refreshTokens(refreshToken);
      if (newTokens.token && newTokens.refreshToken) {
        headerToken({ res, token: newTokens.token, refreshToken: newTokens.refreshToken });
        // Set request variables
        req.user = newTokens.user;
        if (req.user) {
          req.device = req.user.device ? await DeviceModel.findOne({ _id: req.user.device }) : null;
          req.phone = req.user.phone ? await PhoneModel.findOne({ _id: req.user.phone }) : null;
          // Set new timestamps
          req.user.markModified('updatedAt');
          req.user.save();
          if (req.device) {
            req.device.markModified('updatedAt');
            req.device.save();
          }
          if (req.phone) {
            req.phone.markModified('updatedAt');
            req.phone.save();
          }
        }
        success = true;
        console.log(`JWT: Token Refresh (t): ${newTokens.token}`);
        console.log(`JWT: Token Refresh (r): ${newTokens.refreshToken}`);
      }
    }
  }
  // Login
  if (!success) {
    console.log('JWT: Token Error or Credentials present');
    let user = null;
    let device = null;
    let phone = null;
    if (deviceHash) {
      // User
      device = await DeviceModel.findOne({
        deviceHash: bcrypt.hashSync(deviceHash, CONSTANTS.BCRYPT_SALT),
      });
      phone = phoneHash ? await PhoneModel.findOne({
        phoneHash: bcrypt.hashSync(phoneHash, CONSTANTS.BCRYPT_SALT),
      }) : null;
      user = await UserModel.findOne({ device, phone });
      if (!user) {
        console.log('JWT: Create new User');
        // Device
        if (!device) {
          device = new DeviceModel({
            deviceHash: bcrypt.hashSync(deviceHash, CONSTANTS.BCRYPT_SALT),
          });
          await device.save();
        }

        // Create user
        user = new UserModel({ device, phone });
        await user.save();
      }
      console.log(`JWT: Token New for User: ${user._id}`);
      const [createToken, createRefreshToken] = await createTokens(user._id);
      headerToken({ res, token: createToken, refreshToken: createRefreshToken });
      // Set new timestamps
      user.markModified('updatedAt');
      await user.save();
      device.markModified('updatedAt');
      await device.save();
      if (phone) {
        phone.markModified('updatedAt');
        await phone.save();
      }
      console.log(`JWT: Token New (t): ${createToken}`);
      console.log(`JWT: Token New (r): ${createRefreshToken}`);
    }
    // Set request variables
    req.user = user;
    req.device = device;
    req.phone = phone;
  }
  next();
};
