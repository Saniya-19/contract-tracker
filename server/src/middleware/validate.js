import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware factory to validate req[source] (defaults to req.body) against a provided Zod schema.
 * Throws an ApiError(400) with concatenated readable validation messages on failure.
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const message = result.error.errors.map((err) => err.message).join(', ');
    throw new ApiError(400, message);
  }

  // Replace req[source] with parsed and sanitized values
  req[source] = result.data;
  next();
};

export default validate;
