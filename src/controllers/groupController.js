import mongoose from "mongoose";
import SavingsGroup from "../models/SavingsGroup.js";
import Membership from "../models/Membership.js";
import ApiError from "../utils/ApiError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { uploadImage, deleteImage } from "../utils/cloudinaryUpload.js";

const FREQUENCIES = ["weekly", "bi-weekly", "monthly"];

const assertValidId = (id, label = "ID") => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label}`);
};

const findGroupOr404 = async (groupId) => {
  assertValidId(groupId, "group ID");
  const group = await SavingsGroup.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");
  return group;
};

// R9: loads the group and confirms the logged-in user is its creator.
const loadGroupAsCreator = async (groupId, user) => {
  const group = await findGroupOr404(groupId);
  if (!group.creator.equals(user._id)) throw new ApiError(403, "Only the group creator can do this");
  return group;
};

const countApproved = (groupId) => Membership.countDocuments({ group: groupId, status: "approved" });

// ---------- A7 ----------
export const createGroup = async (req, res) => {
  const { name, description, contributionAmount, frequency, maxMembers } = req.body || {};

  if (typeof name !== "string" || name.trim().length < 3 || name.trim().length > 60) {
    throw new ApiError(400, "Group name is required (3 to 60 characters)");
  }
  if (!Number.isInteger(contributionAmount) || contributionAmount < 1) {
    throw new ApiError(400, "Contribution amount must be a whole number greater than 0");
  }
  if (!FREQUENCIES.includes(frequency)) {
    throw new ApiError(400, "Frequency must be weekly, bi-weekly or monthly");
  }
  if (!Number.isInteger(maxMembers) || maxMembers < 4 || maxMembers > 20) {
    throw new ApiError(400, "Group size must be between 4 and 20");
  }

  // creator always comes from the token, never from the body
  const group = await SavingsGroup.create({
    name: name.trim(),
    description: typeof description === "string" ? description.trim() : undefined,
    creator: req.user._id,
    contributionAmount,
    frequency,
    maxMembers,
    status: "open",
  });

  try {
    await Membership.create({
      group: group._id,
      user: req.user._id,
      status: "approved",
      payoutPosition: 1,
      approvedAt: new Date(),
    });
  } catch (error) {
    await SavingsGroup.findByIdAndDelete(group._id); // do not leave a group with no creator membership
    throw error;
  }
  return sendSuccess(res, 201, "Group created successfully", group);
};

// ---------- A8 ----------
export const listOpenGroups = async (req, res) => {
  const groups = await SavingsGroup.find({ status: "open" })
    .populate("creator", "fullName")
    .sort({ createdAt: -1 })
    .lean();

  const counts = await Membership.aggregate([
    { $match: { status: "approved", group: { $in: groups.map((g) => g._id) } } },
    { $group: { _id: "$group", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const result = groups
    .map((g) => {
      const approvedCount = countMap.get(String(g._id)) || 0;
      return { ...g, approvedCount, spotsLeft: g.maxMembers - approvedCount };
    })
    .filter((g) => g.spotsLeft > 0); // hide full groups

  return sendSuccess(res, 200, "Open groups fetched", result);
};

export const myGroups = async (req, res) => {
  const memberships = await Membership.find({ user: req.user._id })
    .populate("group")
    .sort({ createdAt: -1 });
  const result = memberships
    .filter((m) => m.group)
    .map((m) => ({
      group: m.group,
      membershipStatus: m.status,
      payoutPosition: m.payoutPosition,
    }));
  return sendSuccess(res, 200, "Your groups fetched", result);
};

export const getGroup = async (req, res) => {
  const group = await findGroupOr404(req.params.groupId);
  await group.populate("creator", "fullName");

  const mine = await Membership.findOne({ group: group._id, user: req.user._id });
  const isApprovedMember = mine?.status === "approved";
  // Open groups are visible to everyone (people need to see a group to ask to join it).
  // Once a group has started, only its members can see it (R15).
  if (group.status !== "open" && !isApprovedMember) {
    throw new ApiError(403, "You are not a member of this group");
  }

  const members = await Membership.find({ group: group._id, status: "approved" })
    .populate("user", "fullName")
    .sort({ payoutPosition: 1 });

  return sendSuccess(res, 200, "Group fetched", {
    group,
    creatorName: group.creator.fullName,
    myMembershipStatus: mine ? mine.status : null,
    members: members.map((m) => ({
      userId: m.user._id,
      fullName: m.user.fullName,
      payoutPosition: m.payoutPosition,
    })),
  });
};

// ---------- A9 ----------
export const joinGroup = async (req, res) => {
  const group = await findGroupOr404(req.params.groupId);
  if (group.status !== "open") throw new ApiError(400, "This group is no longer accepting members");

  if ((await countApproved(group._id)) >= group.maxMembers) throw new ApiError(400, "This group is full");

  const existing = await Membership.findOne({ group: group._id, user: req.user._id });
  if (existing) {
    if (existing.status === "rejected") {
      existing.status = "pending"; // A7: a rejected user may ask again while the group is open
      await existing.save();
      return sendSuccess(res, 200, "Join request sent again", existing);
    }
    throw new ApiError(409, `You already have a ${existing.status} request for this group`);
  }

  const membership = await Membership.create({
    group: group._id,
    user: req.user._id,
    status: "pending",
    payoutPosition: null,
  });
  return sendSuccess(res, 201, "Join request sent", membership);
};

// ---------- A10 ----------
export const getRequests = async (req, res) => {
  const group = await loadGroupAsCreator(req.params.groupId, req.user);
  const requests = await Membership.find({ group: group._id, status: "pending" })
    .populate("user", "fullName email")
    .sort({ createdAt: 1 });
  return sendSuccess(res, 200, "Pending requests fetched", requests);
};

export const approveMember = async (req, res) => {
  const group = await loadGroupAsCreator(req.params.groupId, req.user);
  assertValidId(req.params.userId, "user ID");

  const membership = await Membership.findOne({
    group: group._id,
    user: req.params.userId,
    status: "pending",
  });
  if (!membership) throw new ApiError(404, "No pending request found for this user");

  if (group.status !== "open") throw new ApiError(400, "This group has already started");
  const approvedCount = await countApproved(group._id);
  if (approvedCount >= group.maxMembers) throw new ApiError(400, "This group is full");

  membership.status = "approved";
  membership.payoutPosition = approvedCount + 1; // R11: join order
  membership.approvedAt = new Date();
  await membership.save();
  return sendSuccess(res, 200, "Member approved", membership);
};

export const rejectMember = async (req, res) => {
  const group = await loadGroupAsCreator(req.params.groupId, req.user);
  assertValidId(req.params.userId, "user ID");

  const membership = await Membership.findOne({
    group: group._id,
    user: req.params.userId,
    status: "pending",
  });
  if (!membership) throw new ApiError(404, "No pending request found for this user");

  membership.status = "rejected";
  await membership.save();
  return sendSuccess(res, 200, "Request rejected", membership);
};

// ---------- A11 ----------
export const startGroup = async (req, res) => {
  const group = await loadGroupAsCreator(req.params.groupId, req.user);
  if (group.status !== "open") throw new ApiError(400, "Group has already started");

  const approvedCount = await countApproved(group._id);
  if (approvedCount < 4) throw new ApiError(400, "At least 4 approved members are needed to start");

  group.status = "active";
  group.startDate = new Date();
  await group.save();

  const order = await Membership.find({ group: group._id, status: "approved" })
    .populate("user", "fullName")
    .sort({ payoutPosition: 1 });

  return sendSuccess(res, 200, "Group started", {
    group,
    startDate: group.startDate,
    payoutOrder: order.map((m) => ({
      payoutPosition: m.payoutPosition,
      userId: m.user._id,
      fullName: m.user.fullName,
    })),
  });
};

// ---------- C4 ----------
export const uploadGroupImage = async (req, res) => {
  const group = await loadGroupAsCreator(req.params.groupId, req.user);
  if (!req.file) throw new ApiError(400, "Image file is required (field name: image)");
  if (group.image?.publicId) await deleteImage(group.image.publicId);
  group.image = await uploadImage(req.file.buffer, "ajo/groups");
  await group.save();
  return sendSuccess(res, 200, "Group image updated", { image: group.image });
};
