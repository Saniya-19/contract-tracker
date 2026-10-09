import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware to handle unmatched route requests (404 Not Found).
 */
export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found - ${req.originalUrl}`);
  next(error);
};
