export const sendSuccess = (res, statusCode, message, data = {}) =>
  res.status(statusCode).json({ success: true, message, data });

export const sendError = (res, statusCode, message) =>
  res.status(statusCode).json({ success: false, message, data: {} });
