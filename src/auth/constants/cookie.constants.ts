import { CookieOptions } from 'express';

export const REFRESH_TOKEN_KEY = 'refreshToken';
export const BASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
