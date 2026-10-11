import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String, required: [true, "Full name is required"],
            trim: true},

            email: {
                type: String, required: [true, "Email is required"],
                unique: true,
                lowercase: true,
                trim: true,
            },

            password: {
                type: String, reqiured: [true, "Password is required"],
                select: false,
            },

            emailVerified: {
                type: Boolean, dafault: false
            },
            verificationToken: { type: String,
                 select: false
                },
            verificationTokenExpiry: {
                typr: Date, select: false
            },

            profilePicture: {
                url: String,
                publicId: String,
            },
        }, {timestamps: true}
);

// hash only when the password change. no next() callback.
userSchema.pre("save", async function () {
    if (!this.isModified("password"))
        return;
    this.password = await bcrypt.hash(this.password, 10);
});

// The document must have loaded with .select("+password").
userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);