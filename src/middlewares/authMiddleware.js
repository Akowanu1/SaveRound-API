import ApiError from '../utils/ApiError.js';

// Temporary auth middleware for testing your uploads
const protect = (req, res, next) => {
  // Mocking req.user so you can test routes in Postman right now
  req.user = { _id: '6aca8d84b327276dbc2e2bea' };
  next();
};

export default protect;