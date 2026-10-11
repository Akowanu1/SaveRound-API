
import express from "express";

import {
  register,
  verifyEmail,
  login,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logout
} from "../controllers/authController.js";
import {
  loginLimiter,  
  resendVerificationLimiter 
} from "../middleware/rateLimiter.js";
import { protect } from "../middlewares/authMiddleware.js";




const router = express.Router();

router.post("/register", register);

router.get("/verify-email", verifyEmail);

router.post("/login", loginLimiter, login);

router.post("/resend-verification", resendVerificationLimiter, resendVerificationEmail);

router.post("/forgot-password", protect, forgotPassword);

router.post("/reset-password", protect, resetPassword);

router.post("/refresh-token", refreshAccessToken);

router.post("/logout", logout);

export default router;
 