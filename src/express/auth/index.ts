/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import CONFIG from '../../config';
import UserModel from '../../models/User';
import DeviceModel from '../../models/Device';
import PhoneModel from '../../models/Phone';

export const createTokens = async user => {
  const token = jwt.sign(
    {
      user,
    },
    CONFIG.AUTH_JWT_SECRET,
    {
      expiresIn: CONFIG.AUTH_JWT_TTL,
    },
  );

  const refreshToken = jwt.sign(
    {
      user,
    },
    CONFIG.AUTH_JWT_SECRET,
    {
      expiresIn: CONFIG.AUTH_JWT_REFRESH_TTL,
    },
  );

  return Promise.all([token, refreshToken]);
};

const refreshTokens = async refreshToken => {
  // Verify Token
  try {
    jwt.verify(refreshToken, CONFIG.AUTH_JWT_SECRET);
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
  Log.jwt(`JWT: Token Refresh for User: ${user._id}`);
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

  if (CONFIG.DEBUG) {
    res.cookie('debugToken', token, { maxAge: 900000, httpOnly: true });
    res.cookie('debugRefreshToken', refreshToken, { maxAge: 900000, httpOnly: true });
  }
};

export const auth = async (req, res, next) => {
  Log.debug(`Server: Connection from: ${req.connection.remoteAddress}`);
  let token = req.headers['x-token'] || (CONFIG.DEBUG ? req.cookies.debugToken : null);
  // In some cases the old Client transmitts the token via authorization header as 'Bearer [token]'
  if (CONFIG.JWT_BACKWARD_COMPATIBILITY && !token && req.headers.authorization) {
    token = req.headers.authorization.substr(7);
  }
  const deviceHash =
    req.headers['x-device-hash'] || (CONFIG.DEBUG ? req.query.deviceHash || null : null);
  const phoneHash =
    req.headers['x-phone-hash'] || (CONFIG.DEBUG ? req.query.phoneHash || null : null);
  if (deviceHash || phoneHash) {
    Log.jwt(`JWT: Credentials with DeviceHash(${deviceHash}) PhoneHash(${phoneHash})`);
  }

  let success = false;
  // Check existing JWT Session
  // If Credentials are also present use them instead
  if (token && !deviceHash) {
    Log.jwt(`JWT: Token: ${token}`);
    try {
      const userid = jwt.verify(token, CONFIG.AUTH_JWT_SECRET).user;
      // Set request variables
      req.user = await UserModel.findOne({ _id: userid });
      if (req.user) {
        req.device = req.user.device ? await DeviceModel.findOne({ _id: req.user.device }) : null;
        req.phone = req.user.phone ? await PhoneModel.findOne({ _id: req.user.phone }) : null;
        // Set new timestamps
        req.user.markModified('updatedAt');
        await req.user.save();
        if (req.device) {
          req.device.markModified('updatedAt');
          await req.device.save();
        }
        if (req.phone) {
          req.phone.markModified('updatedAt');
          await req.phone.save();
        }
      }
      success = true;
      Log.jwt(`JWT: Token valid: ${token}`);
    } catch (err) {
      // Check for JWT Refresh Ability
      Log.jwt(`JWT: Token Error: ${err}`);
      const refreshToken =
        req.headers['x-refresh-token'] || (CONFIG.DEBUG ? req.cookies.debugRefreshToken : null);
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
          await req.user.save();
          if (req.device) {
            req.device.markModified('updatedAt');
            await req.device.save();
          }
          if (req.phone) {
            req.phone.markModified('updatedAt');
            await req.phone.save();
          }
        }
        success = true;
        Log.jwt(`JWT: Token Refresh (t): ${newTokens.token}`);
        Log.jwt(`JWT: Token Refresh (r): ${newTokens.refreshToken}`);
      }
    }
  }
  // Login
  if (!success) {
    let user = null;
    let device = null;
    let phone = null;
    if (deviceHash) {
      Log.jwt('JWT: Credentials present');
      // User
      device = await DeviceModel.findOne({
        deviceHash: crypto
          .createHash('sha256')
          .update(deviceHash)
          .digest('hex'),
      });
      phone = phoneHash
        ? await PhoneModel.findOne({
            phoneHash: crypto
              .createHash('sha256')
              .update(phoneHash)
              .digest('hex'),
          })
        : null;
      user = await UserModel.findOne({ device, phone });
      if (!user) {
        Log.jwt('JWT: Create new User');
        // Device
        if (!device) {
          device = new DeviceModel({
            deviceHash: crypto
              .createHash('sha256')
              .update(deviceHash)
              .digest('hex'),
          });
          await device.save();
        }

        // Create user
        user = new UserModel({ device, phone });
        await user.save();
      }
      Log.jwt(`JWT: Token New for User: ${user._id}`);
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
      Log.jwt(`JWT: Token New (t): ${createToken}`);
      Log.jwt(`JWT: Token New (r): ${createRefreshToken}`);
    }
    // Set request variables
    req.user = user;
    req.device = device;
    req.phone = phone;
  }
  next();
};
