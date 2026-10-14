import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getGroupSummary,
  recordContribution,
} from "../controllers/contributionController.js";

const router = express.Router();

router.post("/groups/:groupId/contributions", protect, recordContribution);
router.get("/groups/:groupId/summary", protect, getGroupSummary);

export default router;