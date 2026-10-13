import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new ApiError(401, "No token provided");

  const token = header.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, "User no longer exists");
  req.user = user;
  next();
};
