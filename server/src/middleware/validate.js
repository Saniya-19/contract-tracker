import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware factory to validate req.body against a provided Zod schema.
 * Throws an ApiError(400) with concatenated readable validation messages on failure.
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.errors.map((err) => err.message).join(', ');
    throw new ApiError(400, message);
  }

  // Replace req.body with parsed and sanitized values
  req.body = result.data;
  next();
};

export default validate;
