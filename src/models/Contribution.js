import mongoose from "mongoose";

const wholeNumber = { validator: Number.isInteger, message: "{PATH} must be a whole number" };

const contributionSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "SavingsGroup", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cycleNumber: { type: Number, required: true, min: 1, validate: wholeNumber },
    amount: { type: Number, required: true, min: 1, validate: wholeNumber },
    paidOn: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

// R14: one contribution per member per cycle per group.
contributionSchema.index({ group: 1, user: 1, cycleNumber: 1 }, { unique: true });

export default mongoose.model("Contribution", contributionSchema);
