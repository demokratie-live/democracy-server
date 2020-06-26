/* eslint no-underscore-dangle: ["error", { "allow": ["_id"] }] */
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import CONFIG from '../../config';

export const createTokens = async (user: string) => {
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
