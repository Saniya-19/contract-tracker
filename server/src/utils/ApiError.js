/**
 * Custom error class for API errors with HTTP status code and message.
 */
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}
