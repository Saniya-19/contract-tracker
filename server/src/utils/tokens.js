import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * Generate a short-lived JWT access token (15 minutes)
 * Payload includes user ID and role
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: '15m',
    }
  );
};

/**
 * Generate a long-lived JWT refresh token (7 days)
 * Payload includes user ID
 */
export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: '7d',
    }
  );
};

/**
 * Verify a JWT access token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

/**
 * Verify a JWT refresh token
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

/**
 * Generate a SHA-256 hash of a token string for safe database storage
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Refresh token cookie configuration
 */
export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
});

/**
 * Set the refresh token as an httpOnly cookie on the response
 */
export const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
};

/**
 * Clear the refresh token httpOnly cookie on the response
 */
export const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  });
};
