import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
    {
        group: {
            type: mongoose.Schema.Types.ObjectId, ref: "SavingsGroup",
            required: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId, ref: "User",
            required: true
        },

        status: {
            type: String, enum: ["pending", "approved", "rejected"],
            default: "pending"
        },

        payoutPosition: {
            type: Number, default: null
        },
        approvedAt: Date,
    }, {timestamps: true}
);

// R8: one membership per user per group.
membershipSchema.index({ group: 1, user: 1},
    { unique: true }
);

// Safety net for R11: two members can never share
// a payout position in the same group.
membershipSchema.index(
    { group: 1, payoutPosition: 1 },
    {unique: true, partialFilterExpression: {
        payoutPosition: { $type: "number" }
    }}
);

export default mongoose.model("Membership", membershipSchema);