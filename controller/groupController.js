import mongoose from "mongoose"
import SavingsGroup from "../models/SavingsGroup.js";
import { validateGroupInput } from "../utils/validateGroupInput.js";
import { sendError } from "../utils/httpError.js";
import { buildSchedule } from "../utils/cycleHelpers.js";
import {
  getGroupOr404,
  getCreatorGroup,
  isGroupNameTaken,
  createGroupWithCreator,
  activateGroup,
} from "../utils/groupHelpers.js";
import {
  requireApprovedMember,
  createJoinRequest,
  listPendingRequests,
  listApprovedMembers,
  getPendingRequest,
  approveMember,
  rejectMember,
} from "../utils/membershipHelpers.js";

// R4-R7: validate first, then create the group and the creator's membership
export const createGroup = async (req, res) => {
  try {
    const validationError = validateGroupInput(req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    const { name, description, contributionAmount, frequency, maxMembers, startDate } = req.body;
    const groupName = name.trim();

    if (await isGroupNameTaken(groupName)) {
      return res.status(409).json({ message: "Group name already in use" });
    }

    // Creator comes from the token, never the request body
    const group = await createGroupWithCreator({
      name: groupName,
      description,
      creator: req.user._id,
      contributionAmount,
      frequency,
      maxMembers,
      startDate,
    });

    return res.status(201).json(group);
  } catch (error) {
    return sendError(res, error);
  }
};

// R8, R10
export const joinGroup = async (req, res) => {
  try {
    const group = await getGroupOr404(req.params.groupId);
    const membership = await createJoinRequest(group, req.user._id);

    return res.status(201).json(membership);
  } catch (error) {
    return sendError(res, error);
  }
};

// R9: creator only
export const getPendingRequests = async (req, res) => {
  try {
    const group = await getCreatorGroup(req.params.groupId, req.user._id);
    const requests = await listPendingRequests(group._id);

    return res.status(200).json(requests);
  } catch (error) {
    return sendError(res, error);
  }
};

// R9, R10, R11
export const approveRequest = async (req, res) => {
  try {
    const group = await getCreatorGroup(req.params.groupId, req.user._id);
    const membership = await getPendingRequest(group, req.params.membershipId);
    const approved = await approveMember(group, membership);

    return res.status(200).json(approved);
  } catch (error) {
    return sendError(res, error);
  }
};

// R9
export const rejectRequest = async (req, res) => {
  try {
    const group = await getCreatorGroup(req.params.groupId, req.user._id);
    const membership = await getPendingRequest(group, req.params.membershipId);
    const rejected = await rejectMember(membership);

    return res.status(200).json(rejected);
  } catch (error) {
    return sendError(res, error);
  }
};

// R9, R12
export const startGroup = async (req, res) => {
  try {
    const group = await getCreatorGroup(req.params.groupId, req.user._id);
    const started = await activateGroup(group);

    return res.status(200).json(started);
  } catch (error) {
    return sendError(res, error);
  }
};

// R15: members of the group only
export const getGroupDetails = async (req, res) => {
  try {
    const group = await getGroupOr404(req.params.groupId);
    await requireApprovedMember(group._id, req.user._id);
    const members = await listApprovedMembers(group._id);

    return res.status(200).json({ group, members });
  } catch (error) {
    return sendError(res, error);
  }
};

// R15: members of the group only
export const getGroupSchedule = async (req, res) => {
  try {
    const group = await getGroupOr404(req.params.groupId);
    await requireApprovedMember(group._id, req.user._id);
    const members = await listApprovedMembers(group._id);

    return res.status(200).json({ status: group.status, schedule: buildSchedule(group, members) });
  } catch (error) {
    return sendError(res, error);
  }
};