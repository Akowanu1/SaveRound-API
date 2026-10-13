
import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { getPayoutSchedule } from "../controllers/payoutScheduleController.js";

const router = express.Router();

router.get("/:groupId/payout-schedule", protect, getPayoutSchedule);

export default router;
