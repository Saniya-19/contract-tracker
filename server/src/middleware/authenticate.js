import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../models/User.js';

/**
 * Middleware to authenticate requests via Bearer JWT access token.
 * Verifies token, fetches user from database, and attaches it to req.user.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication token required');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new ApiError(401, 'Authentication token required');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token has expired');
    }
    throw new ApiError(401, 'Invalid access token');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, 'User belonging to this token no longer exists');
  }

  req.user = user;
  next();
});

export default authenticate;
