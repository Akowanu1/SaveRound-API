import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { recordContribution } from "../controllers/contributionController.js";

const router = express.Router();

router.post("/groups/:groupId/contributions", protect, recordContribution);

export default router;
