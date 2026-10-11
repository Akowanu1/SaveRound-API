import mongoose from "mongoose";
import GroupMembership from "../models/GroupMembership.js";
import { HttpError } from "./httpError.js";

// Only these user fields are ever returned in responses
const SAFE_USER_FIELDS = "name email";

export const countApprovedMembers = (groupId) =>
  GroupMembership.countDocuments({ group: groupId, status: "approved" });

// R13 / R15: only approved members can view the group
export const requireApprovedMember = async (groupId, userId) => {
  const membership = await GroupMembership.findOne({ group: groupId, user: userId, status: "approved" });
  if (!membership) throw new HttpError(403, "Only approved members of this group can do this");
  return membership;
};

export const listPendingRequests = (groupId) =>
  GroupMembership.find({ group: groupId, status: "pending" })
    .populate("user", SAFE_USER_FIELDS)
    .sort({ createdAt: 1 });

export const listApprovedMembers = (groupId) =>
  GroupMembership.find({ group: groupId, status: "approved" })
    .populate("user", SAFE_USER_FIELDS)
    .sort({ payoutPosition: 1 });

// R8, R10: no duplicate requests, and no requests to a started or full group
export const createJoinRequest = async (group, userId) => {
  if (group.status !== "open") throw new HttpError(400, "This group has already started");
  if ((await countApprovedMembers(group._id)) >= group.maxMembers) {
    throw new HttpError(400, "This group is full");
  }

  // The unique index also covers two simultaneous requests
  const existing = await GroupMembership.findOne({ group: group._id, user: userId });
  if (existing) throw new HttpError(409, "You already have a membership record for this group");

  return GroupMembership.create({ group: group._id, user: userId });
};

export const getPendingRequest = async (group, membershipId) => {
  if (!mongoose.isValidObjectId(membershipId)) throw new HttpError(400, "Invalid request id");

  const membership = await GroupMembership.findOne({ _id: membershipId, group: group._id });
  if (!membership) throw new HttpError(404, "Join request not found");
  if (membership.status !== "pending") throw new HttpError(400, "This request has already been reviewed");
  return membership;
};

// R10, R11: next payout position in join order. The unique index makes two simultaneous
// approvals fail safely instead of sharing a position or exceeding maxMembers.
export const approveMember = async (group, membership) => {
  if (group.status !== "open") throw new HttpError(400, "This group has already started");

  const approvedCount = await countApprovedMembers(group._id);
  if (approvedCount >= group.maxMembers) throw new HttpError(400, "This group is full");

  membership.status = "approved";
  membership.payoutPosition = approvedCount + 1;
  return membership.save();
};

export const rejectMember = (membership) => {
  membership.status = "rejected";
  return membership.save();
};