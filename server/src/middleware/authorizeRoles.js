import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware factory to restrict route access to specified user roles.
 * Throws ApiError(403) if req.user is missing or does not have one of the required roles.
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'Access denied: insufficient permissions');
    }
    next();
  };
};

export default authorizeRoles;
