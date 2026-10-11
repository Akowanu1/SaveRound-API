
import express from "express";

import {
  register,
  verifyEmail,
  login,
  resendVerificationEmail,
} from "../controllers/authController.js";

 

const router = express.Router();

router.post("/register", register);

router.get("/verify-email", verifyEmail);

router.post("/login", login);

router.post("/resend-verification", resendVerificationEmail);


export default router;
 