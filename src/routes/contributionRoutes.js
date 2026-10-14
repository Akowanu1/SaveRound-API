import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  recordContribution, getGroupContributions, getMyContributions, getSummary, getPayoutSchedule,
} from "../controllers/contributionController.js";

// Mounted at /api, so the full paths are written here.
const router = Router();
router.get("/contributions/me", protect, getMyContributions);
router.post("/groups/:groupId/contributions", protect, recordContribution);
router.get("/groups/:groupId/contributions", protect, getGroupContributions);
router.get("/groups/:groupId/summary", protect, getSummary);
router.get("/groups/:groupId/payout-schedule", protect, getPayoutSchedule);
export default router;
