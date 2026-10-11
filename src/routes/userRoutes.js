import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/upload.js";
import { getMe, updateAvatar } from "../controllers/userController.js";

const router = Router();
router.get("/me", protect, getMe);
router.put("/me/avatar", protect, upload.single("image"), updateAvatar);
export default router;
