import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { recordContribution, getMyContributions } from "../controllers/contributionController.js";

const router = express.Router();

router.post("/groups/:groupId/contributions", protect, recordContribution);
router.get("/contributions/me", protect, getMyContributions); // B5

export default router;