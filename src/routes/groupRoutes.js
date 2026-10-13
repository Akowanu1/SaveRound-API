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