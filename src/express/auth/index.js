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

const refreshTokens = async ({token, refreshToken, IP}) => {
  // Verify Token
  try {
    jwt.verify(refreshToken, constants.AUTH_JWT_SECRET);
  } catch (err) {
    return {};
  }
  // Decode Token
  let userId = null;
  try {
    userId = jwt.decode(refreshToken).userId;
  } catch (err) {
    return {};
  }
  // Calculate UserData
  const user = await UserModel.findOne({ where: { _id: userId } });
  let userData = {};
  if (user) {
    userData = {
      userId: user._id,
      isVerified: user.verified,
      isDataSource: constants.WHITELIST_DATA_SOURCES.includes(IP),
    };
  }
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
        token,
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
    const { deviceHash, phoneHash } = req.query;
    console.log(`DeviceHash: ${deviceHash}`);
    const user = await UserModel.findOne({ where: { deviceHash }, raw: true });
    let userData = {};
    if (user) {
      userData = {
        userId: user._id,
        isVerified: user.verified,
        isDataSource: constants.WHITELIST_DATA_SOURCES.includes(req.connection.remoteAddress),
      };
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
