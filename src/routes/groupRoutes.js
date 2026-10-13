import express from "express";

import {
    createGroup,
    getOpenGroups,
    getMyGroups,
    getGroupById,
    requestToJoinGroup,
    getGroupRequests,
    approveMember,
    rejectMember,
    startGroup,
} from "../controllers/groupController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// A7 - create a group
router.post("/", authMiddleware, createGroup);

// A8 browse group
router.post("/", authMiddleware, getOpenGroups);
router.get("/main", authMiddleware, getMyGroups);
router.get("/:groupId", authMiddleware, getGroupById);

// A9 request to join
router.post("/api/groups/:groupId/join", authMiddleware, requestToJoinGroup);
