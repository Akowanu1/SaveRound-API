
import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  try {
    
    // 1. Read the Authorization header
    const authHeader = req.headers.authorization;

    // 2. Check whether the token was provided
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // 3. Extract the token
    const accessToken = authHeader.split(" ")[1];

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // 4. Verify the token
    const decoded = jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_SECRET
    );

    // 5. Attach the authenticated user's ID to the request
    req.user = {
      userId: decoded.userId
    };

    // 6. Allow Express to continue
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token"
    });
  }
};
