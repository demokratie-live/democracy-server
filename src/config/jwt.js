export default {
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || null,
  AUTH_JWT_TTL: process.env.AUTH_JWT_TTL || '1d',
  AUTH_JWT_REFRESH_TTL: process.env.AUTH_JWT_REFRESH_TTL || '7d',
  JWT_BACKWARD_COMPATIBILITY: process.env.JWT_BACKWARD_COMPATIBILITY === 'true',
};
