// A custom error class for problems we expect and want to report cleanly
// (wrong input, not found, not allowed, and so on).
//
// Usage anywhere in the app:  throw new ApiError(404, "Group not found");
// The errorHandler middleware catches it and sends the standard JSON error.
export default class ApiError extends Error {
  constructor(statusCode, message) {
    // Pass the message to the built-in Error so err.message works as normal
    super(message);

    // The HTTP status code the errorHandler will send back (400, 403, 404, ...)
    this.statusCode = statusCode;
  }
}