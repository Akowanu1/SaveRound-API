import mongoose from "mongoose";
import SavingsGroup from "../models/SavingsGroup.js";
import Membership from "../models/Membership.js";
import ApiError from "../utils/ApiError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  getCycleDueDate,
  getCurrentCycle,
  getRecipientForCycle,
} from "../utils/cycle.js";

export const getPayoutSchedule = async (req, res) => {
  const { groupId } = req.params;

  if (!mongoose.isValidObjectId(groupId)) {
    throw new ApiError(400, "Invalid group ID");
  }

  const group = await SavingsGroup.findById(groupId);

  if (!group) {
    throw new ApiError(404, "Group not found");
  }

  const membership = await Membership.findOne({
    group: groupId,
    user: req.user._id,
    status: "approved",
  });

  if (!membership) {
    throw new ApiError(403, "You are not an approved member of this group");
  }

  const approvedMembers = await Membership.find({
    group: groupId,
    status: "approved",
  })
    .populate("user", "fullName")
    .sort({ payoutPosition: 1 })
    .lean();

  // Groups without a start date cannot have scheduled payout dates.
  if (group.status === "open" || !group.startDate) {
    const payoutSchedule = approvedMembers.map((member) => ({
      cycleNumber: member.payoutPosition,
      dueDate: null,
      recipient: member.user?.fullName ?? null,
    }));

    return sendSuccess(
      res,
      200,
      "Payout dates will appear once the group starts.",
      { payoutSchedule }
    );
  }

  const totalCycles = approvedMembers.length;

  const currentCycle =
    group.status === "completed"
      ? totalCycles + 1
      : getCurrentCycle(
          group.startDate,
          group.frequency,
          totalCycles
        );

  const payoutSchedule = Array.from(
    { length: totalCycles },
    (_, index) => {
      const cycleNumber = index + 1;
      const recipient = getRecipientForCycle(
        approvedMembers,
        cycleNumber
      );

      let status = "upcoming";

      if (cycleNumber < currentCycle) {
        status = "past";
      } else if (cycleNumber === currentCycle) {
        status = "current";
      }

      return {
        cycleNumber,
        dueDate: getCycleDueDate(
          group.startDate,
          group.frequency,
          cycleNumber
        ),
        recipient: recipient?.user?.fullName ?? null,
        status,
      };
    }
  );

  return sendSuccess(
    res,
    200,
    "Payout schedule retrieved successfully",
    { payoutSchedule }
  );
};
