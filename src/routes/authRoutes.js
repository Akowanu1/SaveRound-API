import { Router } from "express";
import { register, verifyEmail, resendVerification, login } from "../controllers/authController.js";

const router = Router();
router.post("/register", register);

router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/login", login);
export default router;
