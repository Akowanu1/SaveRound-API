import bcrypt from "bcrypt";
import crypto from "node:crypto";

import User from "../models/userModel.js";
import sendEmail from "../utils/sendEmail.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken
} from "../utils/generateTokens.js";

const MIN_PASSWORD_LENGTH = 8;

const isPasswordStrongEnough = (value) =>
  typeof value === "string" && value.trim().length >= MIN_PASSWORD_LENGTH;

const hasRequiredText = (value) => 
  typeof value === "string" && value.trim().length > 0;

//Register new user
export const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !fullName.trim() ||
      !email.trim() ||
      !isPasswordStrongEnough(password)
    ) {
      return res.status(400).json({
        message: "Enter your full name, a valid email, and a password of at least 8 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    //Check if the email exist on the database
    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    //Generate secure random verification token using crypto
    const secureToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Store only the hash in the database
    const verificationTokenHash = crypto
      .createHash("sha256")
      .update(secureToken)
      .digest("hex");

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      verificationToken: verificationTokenHash,
      verificationTokenExpiry: new Date(
        Date.now() + 15 * 60 * 1000
      )
    });

    const verificationLink =
      `${process.env.APP_URL}/api/auth/verify-email` +
      `?token=${secureToken}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendEmail({
      to: normalizedEmail,
      subject: "Verify your email address",
      html: `
        <h2>Welcome, ${fullName.trim()}!</h2>
        <p>Click the link below to verify your email address.</p>
        <p>
          <a href="${verificationLink}">Verify my email</a>
        </p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not create this account, ignore this email.</p>
      `
    });

    return res.status(201).json({
      message: "Account created. Check your email to verify your account before logging in."
    });
  } catch (error) {
    //check for duplicate mail
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Registration failed. Please try again."
    });
  }
};

//Verify email
export const verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.query;

    if (
      typeof token !== "string" ||
      typeof email !== "string" ||
      !token ||
      !email
    ) {
      return res.status(400).json({
        message: "Verification token and email are required."
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      verificationToken: tokenHash,
      verificationTokenExpiry: { $gt: new Date() }
    }).select(
      "+verificationToken +verificationTokenExpiry"
    );

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification link."
      });
    }

    user.emailVerified = true;
    //reset the verificationToken and verificationTokenExpiry, you can use it once
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;

    await user.save();

    return res.status(200).json({
      message: "Email verified successfully. You can now log in."
    });
  } catch (error) {
    console.error("Email verification error:", error.message);

    return res.status(500).json({
      message: "Email verification failed. Please try again."
    });
  }
};

//Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !hasRequiredText(email) ||
      !hasRequiredText(password)
    ) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

 
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    // Do not issue a login token to an unverified user.
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in."
      });
    }

    const accessToken = generateAccessToken(user._id.toString());

    const refreshToken = generateRefreshToken();

    user.refreshTokenHash = hashRefreshToken(refreshToken);

    await user.save();

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed. Please try again."
    });
  }
};

//Resend verification link
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Email address is required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    });

    // Use the same response whether the account is missing or already verified
    const genericResponse = {
      message:
        "If an unverified account exists for this email, a verification link will be sent."
    };

    if (!user || user.emailVerified) {
      return res.status(200).json(genericResponse);
    }

    // Generate a fresh, secure token.
    const secureToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Store only the token hash in the database.
    const verificationTokenHash = crypto
      .createHash("sha256")
      .update(secureToken)
      .digest("hex");

    user.verificationToken = verificationTokenHash;
    user.verificationTokenExpiry = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    const verificationLink =
      `${process.env.APP_URL}/api/auth/verify-email` +
      `?token=${secureToken}` +
      `&email=${encodeURIComponent(normalizedEmail)}`;

    await sendEmail({
      to: normalizedEmail,
      subject: "Verify your email address",
      html: `
        <h2>Email Verification</h2>
        <p>Hello ${user.fullName},</p>
        <p>Click the link below to verify your email address.</p>
        <p>
          <a href="${verificationLink}">
            Verify my email
          </a>
        </p>
        <p>This link expires in 15 minutes.</p>
      `
    });

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error(
      "Resend verification error:",
      error.message
    );

    return res.status(500).json({
      message: "Unable to process your request. Please try again later."
    });
  }
};





