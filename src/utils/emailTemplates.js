// src/utils/emailTemplates.js
import { APP_NAME } from '../config/constants.js';

// CLIENT_URL is the FRONT-END address (Reference section 16), so strip any
// trailing slash once, here, rather than trusting whoever set the env var.
const BASE = () => process.env.CLIENT_URL.replace(/\/+$/, '');

export function buildVerificationEmail({ fullName, token }) {
  const link = `${BASE()}/verify-email?token=${encodeURIComponent(token)}`;

  return {
    subject: `Verify your ${APP_NAME} email address`,
    html: `
      <div style="font-family:Arial,sans-serif;font-size:15px;color:#222">
        <p>Hi ${fullName},</p>
        <p>Welcome to ${APP_NAME}. Confirm your email to activate your account:</p>
        <p>
          <a href="${link}"
             style="display:inline-block;padding:12px 20px;background:#1a7f5a;
                    color:#fff;text-decoration:none;border-radius:6px">
            Verify email
          </a>
        </p>
        <p>This link expires in <strong>24 hours</strong> (R2). You can ask for a
           new one if it does.</p>
        <p>Didn't sign up for ${APP_NAME}? Ignore this email.</p>
        <p style="color:#888;font-size:13px">— The ${APP_NAME} Team</p>
      </div>`,
    // plainTextVersion optional; most clients render the HTML fine
  };
}