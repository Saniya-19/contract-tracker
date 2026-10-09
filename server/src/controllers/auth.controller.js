import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setRefreshCookie,
  clearRefreshCookie,
  verifyRefreshToken,
} from '../utils/tokens.js';

/**
 * Register a new user account
 * Returns 201 with user object, accessToken, and sets refreshToken in httpOnly cookie
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const user = new User({
    name,
    email,
    password,
    role,
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    user,
    accessToken,
  });
});

/**
 * Authenticate existing user credentials
 * Returns 200 with user object, accessToken, and sets refreshToken in httpOnly cookie
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  setRefreshCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    user,
    accessToken,
  });
});

/**
 * Refresh access token using httpOnly refresh token cookie
 * Rotates both access and refresh tokens
 */
export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token not found');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Invalid refresh token');
  }

  const incomingHash = hashToken(refreshToken);
  if (user.refreshTokenHash !== incomingHash) {
    // Possible token theft or replay attempt - revoke stored token
    user.refreshTokenHash = undefined;
    await user.save();
    clearRefreshCookie(res);
    throw new ApiError(401, 'Invalid refresh token');
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  user.refreshTokenHash = hashToken(newRefreshToken);
  await user.save();

  setRefreshCookie(res, newRefreshToken);

  res.status(200).json({
    success: true,
    accessToken: newAccessToken,
  });
});

/**
 * Log out user by clearing database refreshTokenHash and refresh cookie
 */
export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { refreshTokenHash: 1 },
    });
  }

  clearRefreshCookie(res);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Get profile data of the currently authenticated user
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});
