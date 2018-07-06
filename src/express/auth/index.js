/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import jwt from 'jsonwebtoken';
import UserModel from '../../models/User';
import constants from '../../config/constants';

const createTokens = async (user) => {
  const token = jwt.sign(
    {
      user,
    },
    constants.AUTH_JWT_SECRET,
    {
      expiresIn: constants.AUTH_JWT_TTL,
    },
  );

  const refreshToken = jwt.sign(
    {
      user,
    },
    constants.AUTH_JWT_SECRET,
    {
      expiresIn: constants.AUTH_JWT_REFRESH_TTL,
    },
  );

  return Promise.all([token, refreshToken]);
};

const refreshTokens = async (refreshToken) => {
  // Verify Token
  try {
    jwt.verify(refreshToken, constants.AUTH_JWT_SECRET);
  } catch (err) {
    return {};
  }
  // Decode Token
  let oldUser = null;
  let user = null;
  try {
    oldUser = jwt.decode(refreshToken).user;
  } catch (err) {
    return {};
  }
  // Validate UserData if an old User was set
  if (oldUser) {
    user = await UserModel.findOne({ _id: oldUser._id });
    if (!user) {
      return {};
    }
  }

  console.log('JWT: Token Refresh for User:');
  console.log(user);
  // Generate new Tokens
  const [newToken, newRefreshToken] = await createTokens(user);
  return {
    token: newToken,
    refreshToken: newRefreshToken,
    user,
  };
};

const headerToken = async ({ res, token, refreshToken }) => {
  res.set('Access-Control-Expose-Headers', 'x-token, x-refresh-token');
  res.set('x-token', token);
  res.set('x-refresh-token', refreshToken);

  if (constants.DEBUG) {
    res.cookie('debugToken', token, { maxAge: 900000, httpOnly: true });
    res.cookie('debugRefreshToken', refreshToken, { maxAge: 900000, httpOnly: true });
  }
};

export default async (req, res, next) => {
  console.log(`Server: Connection from: ${req.connection.remoteAddress}`);
  const token = req.headers['x-token'] || (constants.DEBUG ? req.cookies.debugToken : null);
  const deviceHash = req.headers['x-device-hash'] || (constants.DEBUG ? req.query.deviceHash : null);
  const phoneHash = req.headers['x-phone-hash'] || (constants.DEBUG ? req.query.phoneHash : null);
  console.log(`JWT: Credentials with DeviceHash(${deviceHash}) PhoneHash(${phoneHash})`);

  let success = false;
  // Check existing JWT Session
  // If Credentials are also present use them
  if (token && !deviceHash) {
    console.log(`JWT: Token present: ${token}`);
    try {
      const { user } = jwt.verify(token, constants.AUTH_JWT_SECRET);
      req.user = user;
      success = true;
      console.log(`JWT: Token valid: ${token}`);
    } catch (err) {
      // Check for JWT Refresh Ability
      console.log(`JWT: Token Error - refreshing: ${token}`);
      const refreshToken = req.headers['x-refresh-token'] || (constants.DEBUG ? req.cookies.debugRefreshToken : null);
      const newTokens = await refreshTokens(refreshToken);
      if (newTokens.token && newTokens.refreshToken) {
        headerToken({ res, token: newTokens.token, refreshToken: newTokens.refreshToken });
        req.user = newTokens.user;
        success = true;
        console.log(`JWT: Token refreshed: ${newTokens.token}`);
      }
    }
  }
  // Login
  if (!success) {
    console.log(`JWT: Token Error or Credentials present - autologin: ${token}`);
    let user = null;
    if (deviceHash) {
      user = await UserModel.findOne({ deviceHash, phoneHash });
      // Create user
      if (!user) {
        user = new UserModel({ deviceHash, phoneHash });
        user.save();
      }
    }
    console.log('JWT: New Tokens for User:');
    console.log(user);
    const [createToken, createRefreshToken] = await createTokens(user);
    headerToken({ res, token: createToken, refreshToken: createRefreshToken });
    req.user = user;
  }
  next();
};
