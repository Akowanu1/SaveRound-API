import mongoose from "mongoose";
import SavingsGroup from "../models/SavingsGroup.js";
import GroupMembership from "../models/GroupMembership.js";
import { HttpError } from "./httpError.js";
import { countApprovedMembers } from "./membershipHelpers.js";

export const MIN_MEMBERS_TO_START = 4; // R12

export const getGroupOr404 = async (groupId) => {
  if (!mongoose.isValidObjectId(groupId)) throw new HttpError(400, "Invalid group id");

  const group = await SavingsGroup.findById(groupId);
  if (!group) throw new HttpError(404, "Group not found");
  return group;
};

// R9: creator-only actions. The creator is read from the token (req.user), never the body.
export const getCreatorGroup = async (groupId, userId) => {
  const group = await getGroupOr404(groupId);
  if (group.creator.toString() !== userId.toString()) {
    throw new HttpError(403, "Only the group creator can do this");
  }
  return group;
};

// Case-insensitive, so "Ajo Club" and "ajo club" count as the same name
export const isGroupNameTaken = async (name) =>
  Boolean(await SavingsGroup.findOne({ name }).collation({ locale: "en", strength: 2 }));

// R7: the creator is automatically an approved member at payout position 1
export const createGroupWithCreator = async (data) => {
  const group = await SavingsGroup.create(data);

  try {
    await GroupMembership.create({ group: group._id, user: data.creator, status: "approved", payoutPosition: 1 });
  } catch (error) {
    // Don't leave behind a group that has no creator-member
    await SavingsGroup.findByIdAndDelete(group._id);
    throw error;
  }

  return group;
};

// R10, R12: once active, approvals are blocked, which locks the member list and payout order
export const activateGroup = async (group) => {
  if (group.status !== "open") throw new HttpError(400, "This group has already started");

  if ((await countApprovedMembers(group._id)) < MIN_MEMBERS_TO_START) {
    throw new HttpError(400, `A group needs at least ${MIN_MEMBERS_TO_START} approved members to start`);
  }

  // Matching on status keeps a double click from starting the group twice
  const started = await SavingsGroup.findOneAndUpdate(
    { _id: group._id, status: "open" },
    { status: "active" },
    { new: true }
  );
  if (!started) throw new HttpError(400, "This group has already started");
  return started;
};