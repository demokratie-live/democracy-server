/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Response, NextFunction } from 'express';
import CONFIG from '../../config';
import UserModel from '../../models/User';
import DeviceModel from '../../models/Device';
import PhoneModel from '../../models/Phone';
import { ExpressReqContext } from '../../types/graphqlContext';
import { User } from '../../migrations/1-schemas/User';
import { Device } from '../../migrations/12-schemas/Device';
import { Phone } from '../../migrations/3-schemas/Phone';

interface JwtObj {
  user: string | null;
  d: string | null;
  p: string | null;
}

export const createTokens = async (user: User) => {
  let deviceId: string = user.device
    ? typeof user.device === 'string'
      ? user.device
      : user.device._id
    : null;
  let phoneId: string = user.phone
    ? typeof user.phone === 'string'
      ? user.phone
      : user.phone._id
    : null;
  const token = jwt.sign(
    {
      user: user._id,
      d: deviceId,
      p: phoneId,
    },
    CONFIG.AUTH_JWT_SECRET,
    {
      expiresIn: CONFIG.AUTH_JWT_TTL,
    },
  );

  const refreshToken = jwt.sign(
    {
      user: user._id,
      d: deviceId,
      p: phoneId,
    },
    CONFIG.AUTH_JWT_SECRET,
    {
      expiresIn: CONFIG.AUTH_JWT_REFRESH_TTL,
    },
  );

  return Promise.all([token, refreshToken]);
};

const refreshTokens = async (refreshToken: string) => {
  // Verify Token
  try {
    jwt.verify(refreshToken, CONFIG.AUTH_JWT_SECRET);
  } catch (err) {
    global.Log.error(err);
    return {};
  }
  // Decode Token
  let userid = null;
  const jwtUser = jwt.decode(refreshToken);
  if (jwtUser && typeof jwtUser === 'object' && jwtUser.user) {
    userid = jwtUser.user;
  } else {
    return {};
  }
  // Validate UserData if an old User was set
  const user = await UserModel.findOne({ _id: userid });

  if (!user) {
    return {};
  }
  // global.Log.jwt(`JWT: Token Refresh for User: ${user._id}`);
  // Generate new Tokens
  const [newToken, newRefreshToken] = await createTokens(user);
  return {
    token: newToken,
    refreshToken: newRefreshToken,
    user,
  };
};

export const headerToken = async ({
  res,
  token,
  refreshToken,
}: {
  res: Response;
  token: string;
  refreshToken: string;
}) => {
  res.set('Access-Control-Expose-Headers', 'x-token, x-refresh-token');
  res.set('x-token', token);
  res.set('x-refresh-token', refreshToken);

  if (CONFIG.DEBUG) {
    res.cookie('debugToken', token, { maxAge: 900000, httpOnly: true });
    res.cookie('debugRefreshToken', refreshToken, { maxAge: 900000, httpOnly: true });
  }
};

export const auth = async (req: ExpressReqContext, res: Response, next: NextFunction) => {
  global.Log.debug(`Server: Connection from: ${req.connection.remoteAddress}`);
  let token: string | null =
    req.headers['x-token'] || (CONFIG.DEBUG ? req.cookies.debugToken : null);
  // In some cases the old Client transmitts the token via authorization header as 'Bearer [token]'
  if (CONFIG.JWT_BACKWARD_COMPATIBILITY && !token && req.headers.authorization) {
    token = req.headers.authorization.substr(7);
  }
  const deviceHash: string | null =
    req.headers['x-device-hash'] || (CONFIG.DEBUG ? req.query.deviceHash || null : null);
  const phoneHash: string | null =
    req.headers['x-phone-hash'] || (CONFIG.DEBUG ? req.query.phoneHash || null : null);
  if (deviceHash || phoneHash) {
    // global.Log.jwt(`JWT: Credentials with DeviceHash(${deviceHash}) PhoneHash(${phoneHash})`);
  }

  let success = false;
  // Check existing JWT Session
  // If Credentials are also present use them instead
  if (token && !deviceHash) {
    // global.Log.jwt(`JWT: Token: ${token}`);
    try {
      const jwtUser = jwt.verify(token, CONFIG.AUTH_JWT_SECRET) as JwtObj;
      console.log(jwtUser);
      const userid = jwtUser.user;
      // Set request variables
      req.userId = userid;
      if (jwtUser.user) {
        if (jwtUser.d) {
          req.deviceId = jwtUser.d;
        }
        if (jwtUser.p) {
          req.phoneId = jwtUser.p;
        }
      }
      success = true;
      // global.Log.jwt(`JWT: Token valid: ${token}`);
    } catch (err) {
      global.Log.error(err);
      // Check for JWT Refresh Ability
      global.Log.jwt(`JWT: Token Error: ${err}`);
      const refreshToken =
        req.headers['x-refresh-token'] || (CONFIG.DEBUG ? req.cookies.debugRefreshToken : null);
      const newTokens = await refreshTokens(refreshToken);
      if (newTokens.token && newTokens.refreshToken) {
        headerToken({ res, token: newTokens.token, refreshToken: newTokens.refreshToken });
        // Set request variables
        req.userId = newTokens.user._id;
        if (newTokens.user) {
          if (newTokens.user.device) {
            req.deviceId =
              typeof newTokens.user.device === 'string'
                ? newTokens.user.device
                : newTokens.user.device._id;
          }
          if (newTokens.user.phone) {
            req.phoneId =
              typeof newTokens.user.phone === 'string'
                ? newTokens.user.phone
                : newTokens.user.phone._id;
          }
        }
        success = true;
        // global.Log.jwt(`JWT: Token Refresh (t): ${newTokens.token}`);
        // global.Log.jwt(`JWT: Token Refresh (r): ${newTokens.refreshToken}`);
      }
    }
  }
  // Login
  if (!success) {
    let user: User | null = null;
    let device: Device | null = null;
    let phone: Phone | null = null;
    if (deviceHash) {
      // global.Log.jwt('JWT: Credentials present');
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
      user = await UserModel.findOne({ device: device, phone: phone });
      if (!user) {
        // global.Log.jwt('JWT: Create new User');
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
      // global.Log.jwt(`JWT: Token New for User: ${user._id}`);
      const [createToken, createRefreshToken] = await createTokens(user);
      headerToken({ res, token: createToken, refreshToken: createRefreshToken });
      // Set new timestamps
      user.markModified('updatedAt');
      await user.save();
      if (device) {
        device.markModified('updatedAt');
        await device.save();
      }
      if (phone) {
        phone.markModified('updatedAt');
        await phone.save();
      }
      // global.Log.jwt(`JWT: Token New (t): ${createToken}`);
      // global.Log.jwt(`JWT: Token New (r): ${createRefreshToken}`);
    }
    // Set request variables
    req.userId = user ? user._id : null;
    req.deviceId = device ? device._id : null;
    req.phoneId = phone ? phone._id : null;
  }
  next();
};
