import jwt from "jsonwebtoken";

const generateToken = (userId) => {
  if (!userId) throw new Error("User id is required");
  return jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN || "2d",
  });
};

export default generateToken;
