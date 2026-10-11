import mongoose from "mongoose";

const wholeNumber = {
  validator: Number.isInteger,
  message: "{PATH} must be a whole number",
};

const savingsGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      minlength: { value: 3, message: "Group name must be at least 3 characters" },
      maxlength: { value: 60, message: "Group name must be at most 60 characters" },
    },
    description: { type: String, trim: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contributionAmount: {
      type: Number,
      required: [true, "Contribution amount is required"],
      min: [1, "Contribution amount must be at least 1"],
      validate: wholeNumber,
    },
    frequency: {
      type: String,
      required: [true, "Frequency is required"],
      enum: { values: ["weekly", "bi-weekly", "monthly"], message: "Frequency must be weekly, bi-weekly or monthly" },
    },
    maxMembers: {
      type: Number,
      required: [true, "Group size is required"],
      min: { value: 4, message: "Group size must be between 4 and 20" },
      max: { value: 20, message: "Group size must be between 4 and 20" },
      validate: wholeNumber,
    },
    status: { type: String, enum: ["open", "active", "completed"], default: "open" },
    startDate: Date,
    image: { url: String, publicId: String },
  },
  { timestamps: true }
);


export default mongoose.model("SavingsGroup", savingsGroupSchema);