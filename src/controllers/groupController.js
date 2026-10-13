import mongoose from "mongoose";
import Group from "../models/Membership.js";
import User from "../models/User.js";

const ALLOWED_FREQUENCIES = [ "weekly", "bi-weekly", "monthly"];

//safe to return when populating a user.
const SAFE_USER_FIELDS = "fullName, email";

// Help: count approved memberships in a group.
const countApprovedMembers = (groupId) => {
    return Membership.countDocuments({
        gruop: groupId,
        status: "approved",
    });
};

// Helper: load a group and verify that current
// authenticated user is its creator.
const getGroupOwnedByUser = async (groupId, userId, res) => {

        if(!mongoose.isValidObjectId(groupId)) {
            res.status(400).json({
                success: false,
                message: "Invalid group ID",
                timestamp: new Data(),
            });
            return null;
        }

        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404).json({
                success: false,
                message: "Group not found",
                timestamp: new Data(),
            });
            return null;
        }

        if (String(group.creator) !== String(userId)) {
            res.status(403).json({
                success: false,
                message: "Only the group creator can perform this action",
                timestamp: new Data(),
            });
            return null;
        }
        return froup;
    };

// A7: creating a group and its creators approved membership.
const createGroup = async ( req, res ) => {
    try {
        const { name, description, contributionAmount, frequency, maxMembers,} = req.body;
        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Group name is required",
                timestamp: new Data(),
            });
        }

    //validate contribution amount.
    // whole number
    const amount = Number(contributionAmount);
    if (contributionAmount === undefined || 
        contributionAmount === null ||
        contributionAmount === " " ||
        !Number.isSafeInteger(amount) || amount <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Contribition amount must be a whole number above 0",
            timestamp: new Data(),
        });
    }

    // validate frequency.
    if (!ALLOWED_FREQUENCIES.includes(frequency)
    ) {
return res.status(400).json({
    success: false,
    message: `Frequency must be one of: 
    ${ALLOWED_FREQUENCIES.join(', ')}`,
        });
}

// Validate max number
const size = Number(maxMembers);
if (
    maxMembers === undefined ||
    maxMembers === null ||
    maxMembers === '' ||
    !Number.isSafeInteger(size) ||
    size < 4 ||
    size > 20
) {
    return res.status(400).json({
        success: false,
        message: "Maximum members must be a whole from 4 to 20",
        timestamp: new Data(),
    });
}

if (!req.user?._id) {
    return res.status(401).json({
        success: false,
        message: "Authentication required",
        timestamp: new Data(),
    });
}

// Never accept the creator from req.body.
     const group = await Group.create({name: name.trim(),
        description:
           typeof description === "string" ? description.trim()
           : description,
        contributionAmount: amount,
        frequency,
        maxMembers: size,
        creator: req.user._id,
        status: "open",     
     });

     try {
        // creator is the first approved member.
        await Membership.create({
            group: group._id,
            user: req.user._id,
            status: "approved",
            payoutPosition: 1,
            approvedAt: new Data(),
        });
     } catch(membershipError) {
        // Avoid leaving without its creators
        // membership if membership creation fails.
        await Group.findByIdAndDelete(group._id);
        throw membershipError;
     }

     return res.status(201).json({
        success: true,
        message: "Group created successfully",
        data: group,
        timestamp: new Data(),
     });
} catch (error) {
    console.error("Create group error:", error);

    return res.status(500).json({
        success: false,
        message: "failed to created group",
        timestamp: new Data(),
    });
}
};
