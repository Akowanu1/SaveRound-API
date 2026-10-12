// Throw this anywhere; the error handler turns it into a standard JSON error.
export default class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
