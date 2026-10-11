const mongoose = require('mongoose');

// User profile and login information.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    // Save the groups this user belongs to.
    groupIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
    }],
    status: {
      type: String,
      enum: ['pending', 'active'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
