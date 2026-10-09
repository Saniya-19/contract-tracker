/**
 * Wrapper function for asynchronous route handlers to catch errors automatically and pass to Express error middleware.
 * @param {Function} fn - Async express controller function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
