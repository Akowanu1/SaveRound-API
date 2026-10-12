import crypto from "crypto";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import generateToken from "../utils/generateToken.js";
import { sendEmail, verificationEmailHtml } from "../utils/sendEmail.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const newVerification = () => ({
  token: crypto.randomBytes(32).toString("hex"),
  expiry: new Date(Date.now() + DAY_MS),
});

// CLIENT_URL may be a comma-separated list (for CORS); links use the first one.
const sendVerificationEmail = async (user, token) => {
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:3000").split(",")[0].trim();
  const link = `${clientUrl}/verify-email?token=${token}`;
  if (process.env.NODE_ENV !== "production") console.log(`[dev] verification link for ${user.email}: ${link}`);
  try {
    await sendEmail({
      to: user.email,
      subject: "Verify your SaveRound account",
      html: verificationEmailHtml(user.fullName, link),
    });
    return true;
  } catch (error) {
    console.error("Verification email failed:", error.message);
    return false;
  }
};

export const register = async (req, res) => {
  const { fullName, email, password } = req.body || {};
  if (![fullName, email, password].every((v) => typeof v === "string" && v.trim())) {
    throw new ApiError(400, "fullName, email and password are required");
  }
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanEmail)) throw new ApiError(400, "Invalid email format");
  if (password.length < 8) throw new ApiError(400, "Password must be at least 8 characters");

  if (await User.findOne({ email: cleanEmail })) throw new ApiError(409, "Email already registered");

  const { token, expiry } = newVerification();
  const user = await User.create({
    fullName: fullName.trim(),
    email: cleanEmail,
    password,
    emailVerified: false,
    verificationToken: token,
    verificationTokenExpiry: expiry,
  });

  const sent = await sendVerificationEmail(user, token);
  return sendSuccess(
    res,
    201,
    sent
      ? "Account created. Check your email to verify your account."
      : "Account created, but the verification email could not be sent. Use resend-verification.",
    { id: user._id, fullName: user.fullName, email: user.email }
  );
};

export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  // typeof check stops query-object injection such as ?token[$ne]=x
  if (typeof token !== "string" || !token) throw new ApiError(400, "Verification token is required");

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpiry: { $gt: new Date() },
  }).select("+verificationToken +verificationTokenExpiry");
  if (!user) throw new ApiError(400, "Invalid or expired token");

  user.emailVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;
  await user.save();
  return sendSuccess(res, 200, "Email verified. You can now log in.");
};

export const resendVerification = async (req, res) => {
  const { email } = req.body || {};
  if (typeof email !== "string" || !email.trim()) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (user && !user.emailVerified) {
    const { token, expiry } = newVerification();
    user.verificationToken = token;
    user.verificationTokenExpiry = expiry;
    await user.save();
    await sendVerificationEmail(user, token);
  }
  // Same message always, so nobody can discover which emails are registered.
  return sendSuccess(res, 200, "If that account exists and is not verified, a new link has been sent.");
};

export const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    throw new ApiError(400, "Email and password are required");
  }
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  const valid = user && (await user.comparePassword(password));
  if (!valid) throw new ApiError(401, "Invalid credentials"); // same message for both cases

  if (!user.emailVerified) throw new ApiError(403, "Please verify your email before logging in");

  const token = generateToken(user._id);
  return sendSuccess(res, 200, "Login successful", {
    token,
    user: { id: user._id, fullName: user.fullName, email: user.email },
  });
};
