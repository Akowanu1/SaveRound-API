import mongoose from "mongoose";
import SavingsGroup from "../models/SavingsGroup.js";
import Membership from "../models/Membership.js";
import Contribution from "../models/Contribution.js";
import ApiError from "../utils/ApiError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  getCycleDueDate, getCurrentCycle, getRecipientForCycle, calculatePot,
} from "../utils/cycle.js";

const loadGroupAndMembership = async (groupId, user) => {
  if (!mongoose.isValidObjectId(groupId)) throw new ApiError(400, "Invalid group ID");
  const group = await SavingsGroup.findById(groupId);
  if (!group) throw new ApiError(404, "Group not found");
  const membership = await Membership.findOne({ group: group._id, user: user._id, status: "approved" });
  if (!membership) throw new ApiError(403, "You are not a member of this group"); // R15
  return { group, membership };
};

// There is no scheduler (assumption A4), so a group is marked "completed" the first
// time someone touches it after its last cycle has passed.
const getCycleInfo = async (group) => {
  const members = await Membership.find({ group: group._id, status: "approved" })
    .populate("user", "fullName")
    .sort({ payoutPosition: 1 });
  const totalCycles = members.length;

  if (group.status === "open") return { members, totalCycles, currentCycle: null, finished: false };

  const currentCycle = getCurrentCycle(group.startDate, group.frequency, totalCycles);
  const finished = currentCycle !== null && currentCycle > totalCycles;
  if (finished && group.status !== "completed") {
    group.status = "completed";
    await group.save();
  }
  return { members, totalCycles, currentCycle: finished ? null : currentCycle, finished: finished || group.status === "completed" };
};

// ---------- B3 ----------
export const recordContribution = async (req, res) => {
  const { group } = await loadGroupAndMembership(req.params.groupId, req.user);
  const { amount, note } = req.body || {};

  if (group.status === "open") throw new ApiError(400, "This group is not active");
  const { currentCycle, finished } = await getCycleInfo(group);
  if (finished) throw new ApiError(400, "This group has finished all its cycles");
  if (currentCycle === null) throw new ApiError(400, "This group is not active");

  if (!Number.isInteger(amount)) throw new ApiError(400, "Amount must be a whole number");
  if (amount !== group.contributionAmount) {
    throw new ApiError(400, `Amount must equal the group contribution of ${group.contributionAmount}`);
  }

  try {
    const contribution = await Contribution.create({
      group: group._id,
      user: req.user._id, // from the token
      cycleNumber: currentCycle, // calculated, never from the body
      amount,
      note: typeof note === "string" ? note : undefined,
    });
    return sendSuccess(res, 201, "Contribution recorded", contribution);
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "You have already recorded a contribution for this cycle");
    }
    throw error;
  }
};

// ---------- B4 ----------
export const getGroupContributions = async (req, res) => {
  const { group } = await loadGroupAndMembership(req.params.groupId, req.user);
  const filter = { group: group._id };

  if (req.query.cycle !== undefined) {
    const cycle = Number(req.query.cycle);
    if (!Number.isInteger(cycle) || cycle < 1) throw new ApiError(400, "cycle must be a whole number of 1 or more");
    filter.cycleNumber = cycle;
  }

  const list = await Contribution.find(filter)
    .populate("user", "fullName")
    .sort({ cycleNumber: 1, paidOn: 1 });
  return sendSuccess(res, 200, "Contributions fetched", list);
};

// ---------- B5 ----------
export const getMyContributions = async (req, res) => {
  const list = await Contribution.find({ user: req.user._id })
    .populate("group", "name")
    .sort({ paidOn: -1 });
  const totalContributed = list.reduce((sum, c) => sum + c.amount, 0);
  return sendSuccess(res, 200, "Your contributions fetched", { totalContributed, contributions: list });
};

// ---------- B6 ----------
export const getSummary = async (req, res) => {
  const { group } = await loadGroupAndMembership(req.params.groupId, req.user);
  const { members, totalCycles, currentCycle, finished } = await getCycleInfo(group);

  const base = {
    groupId: group._id,
    name: group.name,
    status: group.status,
    contributionAmount: group.contributionAmount,
    frequency: group.frequency,
  };

  if (group.status === "open") {
    return sendSuccess(res, 200, "Group fetched", {
      ...base,
      approvedMembers: members.length,
      maxMembers: group.maxMembers,
      message: "This group has not started yet. Cycle details appear once the creator starts it.",
    });
  }
  if (finished) {
    return sendSuccess(res, 200, "Group fetched", {
      ...base, totalCycles, message: "This group has completed all its cycles.",
    });
  }

  const contributions = await Contribution.find({ group: group._id, cycleNumber: currentCycle });
  const paidIds = new Set(contributions.map((c) => String(c.user)));
  const recipient = getRecipientForCycle(members, currentCycle);

  return sendSuccess(res, 200, "Summary fetched", {
    ...base,
    currentCycle,
    totalCycles,
    dueDate: getCycleDueDate(group.startDate, group.frequency, currentCycle),
    recipient: recipient ? { userId: recipient.user._id, fullName: recipient.user.fullName } : null,
    members: members.map((m) => ({
      userId: m.user._id,
      fullName: m.user.fullName,
      payoutPosition: m.payoutPosition,
      paid: paidIds.has(String(m.user._id)),
    })),
    collected: contributions.reduce((sum, c) => sum + c.amount, 0),
    expected: calculatePot(group.contributionAmount, members.length),
  });
};

// ---------- B7 ----------
export const getPayoutSchedule = async (req, res) => {
  const { group } = await loadGroupAndMembership(req.params.groupId, req.user);
  const { members, totalCycles, currentCycle, finished } = await getCycleInfo(group);

  if (group.status === "open") {
    return sendSuccess(res, 200, "Payout order fetched", {
      message: "Dates appear once the group starts.",
      schedule: members.map((m) => ({
        cycleNumber: m.payoutPosition,
        recipient: m.user.fullName,
        dueDate: null,
        status: "upcoming",
      })),
    });
  }

  const schedule = members.map((m) => {
    const n = m.payoutPosition;
    let status = "upcoming";
    if (finished || n < currentCycle) status = "past";
    else if (n === currentCycle) status = "current";
    return {
      cycleNumber: n,
      dueDate: getCycleDueDate(group.startDate, group.frequency, n),
      recipient: m.user.fullName,
      status,
    };
  });
  return sendSuccess(res, 200, "Payout schedule fetched", { totalCycles, schedule });
};
