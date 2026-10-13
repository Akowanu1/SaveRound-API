import mongoose from "mongoose";
import Group from "../models/Membership.js";
import User from "../models/User.js";
import Membership from "../models/Membership.js";

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

// A8: list open groups that are not full.
const getOpenGroups = async ( req, res ) => {
    try {
        const groups = await Group.find({
            status: "open",
        })
        .populate("creator", "fullName")
        .lean();

        const groupIds = groups.map((group) => group._id);
        const counts = await Membership.aggregate([
            {
                $match: {
                    group: { $in: groupIds },
                },
            },
            {
                $group: {
                    _id: "$group",
                    count: { $sum: 1 },
                },
            },
        ]);

        const countByGroup = new Map(
            counts.map((item) => [
                string(item._id),
                item.count,
            ])
        );

        // groups that have reach capacity is hide.
        const availableGroups = groups.map((group) => ({
            ...group,
            approvedMemberCount: countByGroup.get(String(group._id)) || 0,
        }))
        .filter((group) => group.approvedMemberCount < group.maxMembers
    );

    return res.status(200).json({
        count: availableGroups.lenght,
        groups: availableGroups,
    });
    } catch (error) {
        console.error("Get open groups error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve open groups",
            timestamp: new Data(),
        });
    }
};

// return groups in which the user has a membership
const getMyGroups = async ( req, res ) => {
    try {
        const memberships = await Membership.find({
            user: req.user._id,
        })
        .populate({
            path: "group",
            populate: {
                path: "creator",
                select: "fullName",
            },
        })
        .lean();

        const myGroups = memberships.filter((membership) => membership.group)
        .map((membership) => ({
            ...membership.group,
            membershipStatus: membership.status,
            payoutPosition: membership.payoutPosition,
        }));

        return res.status(200).json({
            count: myGroups.length,
            groups: myGroups,
        });
    } catch (error) {
        console.error("Get my groups error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve your groups",
            timestamp: new Data(),
        });
    }
};

// return groups details and approved members.
const getGroupById = async ( req, res ) => {
    try {
        const { groupId } = req.params;

        if ( !mongoose.isValidObjectId(groupId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID",
                timestamp: new Data(),
            });
        }

        const group = await Group.findById(groupId)
        .select("-__v")
        .populate({
            path: "creator",
            select: SAFE_USER_FIELDS,
        })
        .lean();

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found",
                timestamp: new Data(),
            });
        }

        const members = await Membership.find({
            group:groupId,
            status: "approved",
        })
        .select("user payoutPosition status approvedAt")
        .populate({
            path: "user",
            select: SAFE_USER_FIELDS,
        })
        .SORT({ payoutPosition: 1})
        .lean();

        return res.status(200).json({
            group,
            creator: group.create,
            approvedMembers: members,
        });
    } catch (error) {
        console.error("Get group details error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve group details",
            timestamp: new Data(),
        });
    }
};

// A9 request to join a group.
const requestToJoinGroup = async ( req, res ) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        if ( !mongoose.isValidObjectId(groupId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID",
                timestamp: new Data(),
            });
        }

        const group = await Group.findById(groupId);

        if ( !group ) {
            return res.status(404).json({
                success: false,
                message: "Group not found",
                timestamp: new Data(),
            });
        }

        if ( group.status !== "open" ) {
            return res.status(400).json({
                success: false,
                message: "This group is no longer accepting members",
                timestamp: new Data(),
            });
        }

        const approvedCount = await countApprovedMembers(groupId);

        if ( approvedCount >= group.maxMembers) {
            return res.status(400).json({
                success: false,
                message: "This group is full",
                timestamp: new Data(),
            });
        }

        const existingMembership = await Membership.findOne({
            group: groupId,
            user: userId,
        });

        if ( existingMembership ) {
            if ( existingMembership.status === "pending" ||
                existingMembership.status === "approved"
            ) {
                return res.status(409).json({
                    success: false,
                    message: "You already have a pending or approved membership",
                    timestamp: new Data(),
                });
            }

            if ( existingMembership.status === "rejected") {
                existingMembership.status === "pending";
                existingMembership.payoutPosition = null;
                existingMembership.approvedAt = undefined;

                await existingMembership.save();

                return res.status(200).json({
                    success: true,
                    message: "Membership request submitted again",
                    membership: existingMembership,
                    timestamp: new Data(),
                });
            }

            return res.status(409).json({
                success: false,
                message: "An existing membership prevents a new request",
                timestamp: new Data(),
            });
        }

        const membership = await Membership.create({
            group: groupId,
            user: userId,
            status: "pending",
            payoutPosition: null,
        });

        return res.status(201).json({
            success: true,
            message: "Membership request submitted successfully",
            timestamp: new Data(),
        });
    } catch (error) {
        console.error("join group error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to submit membership request",
            timestamp: new Data(),
        });
    }
};

// A10: Creator views pending membership request.
const getGroupRequests = async ( req, res) => {
    try {
        const group = await getGroupOwnedByUser(
            req.params.groupId,
            req.user._id,
            res
        );

    if ( !group) return;

    const requests = await Membership.find({
        group: group._id,
        status: "pending",
    })
    .select("user group status createAt")
    .populate({
        path: "user",
        select: SAFE_USER_FIELDS,
    })
    .lean();

    return res.status(200).json({
        count: requests.length,
        requests,
    });
} catch (error) {
    console.error("Get group requests error:", error);

    return res.status(500).json({
        success: false,
        message: "Failed to retrieve membership requests",
        timestamp: new Data(),
    });
}
};

// creator approves a pending member.
const approveMember = async ( req , res ) => {
    try {
        const { groupId, userId } = req.params;
        const group = await getGroupOwnedByUser(
            groupId,
            req.user._id,
            res
        );

        if ( !group) return;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "nvalid user ID",
                timestamp: new Data(),
            });
        }

        const membership = await Membership.fiindOne({
            group: group._id,
            user: user._id,
            status: "pending",
        });

        if ( !membership) {
            return res.status(404).json({
                success: false,
                message: "This group is no longer accepting member",
                timestamp: new Data(),
            });
        }

        const approvedCount = await countApprovedMembers(group._id);

        if (approveCount >= group.maxMembers) {
            return res.status(400).json({
                success: false,
                message: "This group is full",
                timestamp: new Data(),
            })
        }

        membership.status = "approved";
        membership.payoutPosition = approvedCount + 1;
        membership.approvedAt = new data(),

        await membership.save();

        return res.status(200).json({
            success: true,
            message: "Member aprroved successfully",
            data: membership,
            timestamp: new Data(),
        });
    } catch (error) {
        console.error("Approve number error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to approved member",
            timestamp: new Data(),
        });
    }
};

//A10: creator rejects a pending member.
const rejectMember = async ( req, res ) => {
    try {
        const { groupId, userId } = req.params;
        const group = await getGroupOwnedByUser(
            groupId,
            req.user._id,
            res
        );

        if (!group) return;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        const membership = await Membership.findOne({
            group: group._id,
            user: userId,
            status: "pending",
        });

        if (!membership) {
            return res.status(404).json({
                success: false,
                message: "Pending membership request not found",
                timestamp: new Data(),
            });
        }

        membership.status = "rejected";
        membership.payoutPosition = null;

        await membership.save();

        return res.status(200).json({
            success: true,
            message: "Membership request rejected",
            timestamp: new Data(),
        });
    } catch (error) {
        console.error("Reject number error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to reject membership request",
            timestamp: new Data(),
        });
    }
};
