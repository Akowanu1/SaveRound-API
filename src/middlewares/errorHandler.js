import { sendError } from "../utils/apiResponse.js";

// Runs when no route matched the request. Register it AFTER all routes in app.js,
// so only unknown URLs reach it. Returns the standard JSON 404 instead of an HTML page.
export const notFound = (req, res) =>
  sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`);

// The single place where every error becomes a JSON response.
// Four parameters: Express recognises this as the error handler.
// It must be registered LAST in app.js, and `next` must stay even though it is unused.
export const errorHandler = (err, req, res, next) => {
  // Start with the status and message from the error itself (ApiError sets both).
  // Anything without a statusCode is an unexpected bug, so it defaults to 500.
  let status = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // The checks below translate known library errors into friendly messages.
  // Only one of them applies per error, so it is an if / else-if chain.

  if (err.name === "ValidationError" && err.errors) {
    // Mongoose schema validation failed (required field missing, value too short, etc.).
    // Join every field's message into one readable sentence.
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.name === "CastError") {
    // Mongoose could not convert a value, usually an invalid ObjectId in the URL.
    // err.path is the field name, so the message says which value was wrong.
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    // MongoDB duplicate key: a unique index was violated (for example an email
    // that is already registered). 409 means "conflict".
    status = 409;
    message = "Duplicate record: this already exists";
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    // The login token is invalid, tampered with, or expired.
    status = 401;
    message = "Invalid or expired token";
  } else if (err.type === "entity.parse.failed") {
    // express.json() could not parse the request body (broken JSON).
    status = 400;
    message = "Request body contains invalid JSON";
  } else if (err.type === "entity.too.large") {
    // The request body is bigger than the limit set in express.json({ limit }).
    status = 413;
    message = "Request body is too large";
  } else if (err.name === "MulterError") {
    // Image upload problem. A file over the size limit gets a clear message;
    // other Multer errors use their own message.
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Image must be 2MB or smaller" : err.message;
  }

  // Server errors (500 and above) are our bug, not the client's.
  if (status >= 500) {
    // Log the full error, including the stack trace, on the server only.
    console.error(err);
    // In production, hide the real message so no internal details leak to the client.
    if (process.env.NODE_ENV === "production") message = "Internal Server Error";
  }

  // Send the standard { success: false, message, data: {} } response.
  // The stack trace is never included in the response.
  return sendError(res, status, message);
};