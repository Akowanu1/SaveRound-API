import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { recordContribution, getGroupContributions } from "../controllers/contributionController.js";

const router = express.Router();

router.post("/groups/:groupId/contributions", protect, recordContribution);
router.get("/groups/:groupId/contributions", protect, getGroupContributions)

export default router;
