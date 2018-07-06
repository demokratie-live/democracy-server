/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import jwt from 'jsonwebtoken';
import UserModel from '../../models/User';
import constants from '../../config/constants';

const createTokens = async ({ _id, isVerified, isDataSource }) => {
  const token = jwt.sign(
    {
      _id,
      isVerified,
      isDataSource,
    },
    constants.AUTH_JWT_SECRET,
    {
      expiresIn: constants.AUTH_JWT_TTL,
    },
  );

  const refreshToken = jwt.sign(
    {
      _id,
      isVerified,
      isDataSource,
    },
    constants.AUTH_JWT_SECRET,
    {
      expiresIn: constants.AUTH_JWT_REFRESH_TTL,
    },
  );

  return Promise.all([token, refreshToken]);
};

const refreshTokens = async ({ refreshToken, IP }) => {
  // Verify Token
  try {
    jwt.verify(refreshToken, constants.AUTH_JWT_SECRET);
  } catch (err) {
    return {};
  }
  // Decode Token
  let _id = null;
  try {
    ({ _id } = jwt.decode(refreshToken));
  } catch (err) {
    return {};
  }
  // Calculate UserData
  const user = await UserModel.findOne({ _id });
  if (!user) {
    return {};
  }
  const userData = {
    _id: user._id,
    isVerified: user.verified,
    isDataSource: constants.WHITELIST_DATA_SOURCES.includes(IP),
  };

  console.log('Refresh Tokens Data:');
  console.log(userData);
  // Generate new Tokens
  const [newToken, newRefreshToken] = await createTokens(userData);
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
  console.log(`Connection from: ${req.connection.remoteAddress}`);
  const token = req.headers['x-token'] || (constants.DEBUG ? req.cookies.debugToken : null);
  let success = false;
  // Check existing JWT Session
  if (token) {
    console.log(`Token present: ${token}`);
    try {
      const { user } = jwt.verify(token, constants.AUTH_JWT_SECRET);
      req.user = user;
      success = true;
      console.log(`Token valid: ${token}`);
    } catch (err) {
      // Check for JWT Refresh Ability
      console.log(`Token Error - refreshing: ${token}`);
      const refreshToken = req.headers['x-refresh-token'] || (constants.DEBUG ? req.cookies.debugRefreshToken : null);
      const newTokens = await refreshTokens({
        refreshToken,
        IP: req.connection.remoteAddress,
      });
      if (newTokens.token && newTokens.refreshToken) {
        headerToken({ res, token: newTokens.token, refreshToken: newTokens.refreshToken });
        req.user = newTokens.user;
        success = true;
        console.log(`Token refreshed: ${newTokens.token}`);
      }
    }
  }
  // Login
  if (!success) {
    console.log(`Token Error - autologin: ${token}`);
    const deviceHash = req.headers['x-device-hash'] || (constants.DEBUG ? req.query.deviceHash : null);
    const phoneHash = req.headers['x-phone-hash'] || (constants.DEBUG ? req.query.phoneHash : null);
    console.log(`Credentials: DeviceHash(${deviceHash}) PhoneHash(${phoneHash})`);
    const userData = {
      _id: null,
      isVerified: false,
      isDataSource: constants.WHITELIST_DATA_SOURCES.includes(req.connection.remoteAddress),
    };
    if (deviceHash) {
      let user = await UserModel.findOne({ deviceHash, phoneHash });
      // Create user
      if (!user) {
        user = new UserModel({ deviceHash, phoneHash });
        user.save();
      }
      userData._id = user._id;
      userData.isVerified = user.verified;
    }
    console.log('New Tokens Data:');
    console.log(userData);
    const [createToken, createRefreshToken] = await createTokens(userData);
    headerToken({ res, token: createToken, refreshToken: createRefreshToken });
    req.user = userData;
  }
  next();
};
