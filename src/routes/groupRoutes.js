import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/upload.js";
import {
  createGroup, listOpenGroups, myGroups, getGroup, joinGroup, getRequests,
  approveMember, rejectMember, startGroup, uploadGroupImage,
} from "../controllers/groupController.js";

const router = Router();

router.post("/", protect, createGroup);
router.get("/", protect, listOpenGroups);
router.get("/mine", protect, myGroups); // MUST be before "/:groupId"
router.get("/:groupId", protect, getGroup);
router.post("/:groupId/join", protect, joinGroup);
router.get("/:groupId/requests", protect, getRequests);
router.patch("/:groupId/members/:userId/approve", protect, approveMember);
router.patch("/:groupId/members/:userId/reject", protect, rejectMember);
router.post("/:groupId/start", protect, startGroup);
router.post("/:groupId/image", protect, upload.single("image"), uploadGroupImage);

export default router;
