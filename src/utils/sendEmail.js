// src/utils/sendEmail.js
import ApiError from '../utils/ApiError.js'; // ⚠️ needs Unit 1 merged first
import { APP_NAME } from "../config/constants.js";

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;

  if (!apiKey || !fromEmail) {
    // fail fast: a missing key is a config bug, not a network error
    throw new ApiError(500, 'Email service is not configured');
  }

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,   // header, NOT a query param — keeps it out of access logs
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: `${APP_NAME} Support`, email: fromEmail }, // ← swap for APP_NAME if you like
      to: [{ email: to }],
      subject,
      htmlContent: html,   // note: "htmlContent", not "html"
    }),
  });

  if (!res.ok) {
    const detail = await res.text();   // read the body BEFORE throwing
    // never log the request headers — that is where the key lives
    console.error(`Brevo ${res.status}:`, detail);
    throw new ApiError(502, 'Could not send email right now. Please try again.');
  }

  return res.json(); // Brevo returns { messageId: '...' }
}