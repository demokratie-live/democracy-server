/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import jwt from 'jsonwebtoken';
import UserModel from '../../models/User';
import constants from '../../config/constants';

const createTokens = async ({ userId, isVerified, isDataSource }) => {
  const token = jwt.sign(
    {
      userId,
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
      userId,
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
  let userId = null;
  try {
    ({ userId } = jwt.decode(refreshToken));
  } catch (err) {
    return {};
  }
  // Calculate UserData
  const user = await UserModel.findOne({ _id: userId });
  if (!user) {
    return {};
  }
  const userData = {
    userId: user._id,
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

export default async (req, res, next) => {
  console.log(`Connection from: ${req.connection.remoteAddress}`);
  const token = req.headers['x-token'] || (constants.DEBUG ? req.cookies.debugToken : null);
  let success = false;
  if (token) {
    console.log(`Token present: ${token}`);
    try {
      const { user } = jwt.verify(token, constants.AUTH_JWT_SECRET);
      req.user = user;
      success = true;
      console.log(`Token valid: ${token}`);
    } catch (err) {
      console.log(`Token Error - refreshing: ${token}`);
      const refreshToken = req.headers['x-refresh-token'] || (constants.DEBUG ? req.cookies.debugRefreshToken : null);
      const newTokens = await refreshTokens({
        refreshToken,
        IP: req.connection.remoteAddress,
      });
      if (newTokens.token && newTokens.refreshToken) {
        res.set('Access-Control-Expose-Headers', 'x-token, x-refresh-token');
        res.set('x-token', newTokens.token);
        res.set('x-refresh-token', newTokens.refreshToken);

        if (constants.DEBUG) {
          res.cookie('debugToken', newTokens.token, { maxAge: 900000, httpOnly: true });
          res.cookie('debugRefreshToken', newTokens.refreshToken, { maxAge: 900000, httpOnly: true });
        }
        req.user = newTokens.user;
        success = true;
        console.log(`Token refreshed: ${newTokens.token}`);
      }
    }
  }
  if (!success) {
    // Login
    console.log(`Token Error - autologin: ${token}`);
    const deviceHash = req.headers['x-device-hash'] || (constants.DEBUG ? req.query.deviceHash : null);
    const phoneHash = req.headers['x-phone-hash'] || (constants.DEBUG ? req.query.phoneHash : null);
    console.log(`Credentials: DeviceHash(${deviceHash}) PhoneHash(${phoneHash})`);
    const userData = {
      userId: null,
      isVerified: false,
      isDataSource: constants.WHITELIST_DATA_SOURCES.includes(req.connection.remoteAddress),
    };
    if (deviceHash) {
      let user = await UserModel.findOne({ deviceHash, phoneHash });
      if (!user) {
        // create user
        user = new UserModel({ deviceHash, phoneHash });
        user.save();
      }
      userData.userId = user._id;
      userData.isVerified = user.verified;
    }
    console.log('New Tokens Data:');
    console.log(userData);
    const [createToken, createRefreshToken] = await createTokens(userData);
    res.set('Access-Control-Expose-Headers', 'x-token, x-refresh-token');
    res.set('x-token', createToken);
    res.set('x-refresh-token', createRefreshToken);
    if (constants.DEBUG) {
      res.cookie('debugToken', createToken, { maxAge: 900000, httpOnly: true });
      res.cookie('debugRefreshToken', createRefreshToken, { maxAge: 900000, httpOnly: true });
    }
  }
  next();
};
