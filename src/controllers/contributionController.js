import mongoose from "mongoose";
import Contribution from "../models/Contribution.js";
import SavingsGroup from "../models/SavingsGroup.js";
import Membership from "../models/Membership.js";
import {
  getCycleDueDate,
  getCurrentCycle,
  getRecipientForCycle,
  calculatePot,
} from '../utils/cycle.js';

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

export const getGroupSummary = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ message: "Invalid group id" });
    }

    const group = await SavingsGroup.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const approvedMembers = await Membership.find({
      group: groupId,
      status: "approved",
    })
      .populate("user", "fullName")
      .sort({ payoutPosition: 1 })
      .lean();

    const isApprovedMember = approvedMembers.some(
      (member) =>
        member.user && String(member.user._id) === String(req.user._id),
    );
    if (!isApprovedMember) {
      return res
        .status(403)
        .json({ message: "You are not an approved member of this group" });
    }

    const totalCycles = group.totalCycles ?? approvedMembers.length;
    const groupDetails = {
      groupId: group._id,
      name: group.name,
      status: group.status,
      contributionAmount: group.contributionAmount,
      frequency: group.frequency,
      startDate: group.startDate ?? null,
      totalCycles,
      memberCount: approvedMembers.length,
    };

    if (group.status !== "active") {
      const message =
        group.status === "completed"
          ? "This group has completed all its cycles."
          : "This group has not started yet. Cycle details will appear once it is active.";
      return res.status(200).json({ ...groupDetails, message });
    }

    const currentCycle = getCurrentCycle(
      group.startDate,
      group.frequency,
      totalCycles,
    );
    if (currentCycle === null) {
      return res.status(200).json({
        ...groupDetails,
        message:
          "This group has not reached its start date yet. Cycle details will appear once it starts.",
      });
    }
    if (currentCycle > totalCycles) {
      return res.status(200).json({
        ...groupDetails,
        message: "All cycles for this group are finished.",
      });
    }

    const dueDate = getCycleDueDate(
      group.startDate,
      group.frequency,
      currentCycle,
    );
    const recipientMember = getRecipientForCycle(
      approvedMembers,
      currentCycle,
    );
    const contributions = await Contribution.find({
      group: groupId,
      cycleNumber: currentCycle,
    }).lean();

    const contributionByUser = new Map(
      contributions.map((contribution) => [
        String(contribution.user),
        contribution,
      ]),
    );
    const members = approvedMembers.map((member) => {
      const paidRecord = contributionByUser.get(String(member.user._id));
      return {
        userId: member.user._id,
        fullName: member.user.fullName,
        payoutPosition: member.payoutPosition,
        paid: Boolean(paidRecord),
        paidOn: paidRecord ? paidRecord.paidOn : null,
      };
    });

    const collected = contributions.reduce(
      (sum, contribution) => sum + contribution.amount,
      0,
    );
    const expected = calculatePot(
      group.contributionAmount,
      approvedMembers.length,
    );

    return res.status(200).json({
      ...groupDetails,
      currentCycle,
      dueDate,
      recipient: recipientMember
        ? {
            userId: recipientMember.user._id,
            fullName: recipientMember.user.fullName,
            payoutPosition: recipientMember.payoutPosition,
          }
        : null,
      members,
      collected,
      expected,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};