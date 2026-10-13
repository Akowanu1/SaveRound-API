import mongoose from "mongoose";
import Contribution from "../models/Contribution.js";
import SavingsGroup from "../models/SavingsGroup.js";
import Membership from "../models/Membership.js";
import { getCurrentCycle } from "../utils/cycle.js";

// Records the logged-in member's contribution for the current cycle of an active group, enforcing rules R13 and R14.
export const recordContribution = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.isValidObjectId(groupId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid group ID", data: {} });
    }

    const group = await SavingsGroup.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found", data: {} });
    }

    if (group.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This group is not active",
        data: {},
      });
    }

    // Pending and rejected requests do not count as membership (R13).
    const membership = await Membership.findOne({
      group: groupId,
      user: req.user._id,
    });
    if (!membership || membership.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "You are not an approved member of this group",
        data: {},
      });
    }

    // Counts approved members instead of using maxMembers, because a group can start with fewer members than its maximum.
    const totalCycles = await Membership.countDocuments({
      group: groupId,
      status: "approved",
    });

    // The cycle is worked out on the server, never read from the body, so nobody can pay for a different cycle (R13).
    const cycleNumber = getCurrentCycle(
      group.startDate,
      group.frequency,
      totalCycles,
    );

    if (cycleNumber === null) {
      return res.status(400).json({
        success: false,
        message: "This group has not started yet",
        data: {},
      });
    }
    if (cycleNumber > totalCycles) {
      return res
        .status(400)
        .json({ success: false, message: "This group has finished", data: {} });
    }

    const { amount, note } = req.body;
    if (Number(amount) !== group.contributionAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount must be exactly ${group.contributionAmount}`,
        data: {},
      });
    }

    // The saved amount comes from the group, and the user from the token, never from the body.
    const contribution = await Contribution.create({
      group: groupId,
      user: req.user._id,
      cycleNumber,
      amount: group.contributionAmount,
      note,
    });

    return res.status(201).json({
      success: true,
      message: "Contribution recorded successfully",
      data: contribution,
    });
  } catch (error) {
    // The unique index on (group, user, cycleNumber) rejects a second payment for the same cycle (R14).
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already recorded a contribution for this cycle",
        data: {},
      });
    }
    // Anything else is unexpected, so it goes to the error handler.
    throw error;
  }
};



// B4: GET /api/groups/:groupId/contributions
export const getGroupContributions = async (req, res) => {
  const { groupId } = req.params;

  if (!mongoose.isValidObjectId(groupId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid group ID", data: {} });
  }

  // Only approved members can view the group's contributions (R15)
  const membership = await Membership.findOne({
    group: groupId,
    user: req.user._id,
  });
  if (!membership || membership.status !== "approved") {
    return res.status(403).json({
      success: false,
      message: "You are not an approved member of this group",
      data: {},
    });
  }

  const filter = { group: groupId };
  if (req.query.cycle !== undefined) {
    const cycle = Number(req.query.cycle);
    if (!Number.isInteger(cycle) || cycle < 1) {
      return res.status(400).json({
        success: false,
        message: "cycle must be a whole number",
        data: {},
      });
    }
    filter.cycleNumber = cycle;
  }

  const contributions = await Contribution.find(filter)
    .populate("user", "fullName")
    .sort({ cycleNumber: 1, paidOn: 1 });

  return res.status(200).json({
    success: true,
    message: "Contributions retrieved successfully",
    data: contributions,
  });
};
