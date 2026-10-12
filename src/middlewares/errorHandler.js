import { sendError } from "../utils/apiResponse.js";

export const notFound = (req, res) =>
  sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`);

// Four parameters: Express recognises this as the error handler.
export const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.name === "ValidationError" && err.errors) {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = "Duplicate record: this already exists";
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    message = "Invalid or expired token";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Request body contains invalid JSON";
  } else if (err.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large";
  } else if (err.name === "MulterError") {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Image must be 2MB or smaller" : err.message;
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === "production") message = "Internal Server Error";
  }
  return sendError(res, status, message);
};