// Brevo HTTP API (Render's free plan blocks SMTP, so no Nodemailer).
export const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error("Email is not configured (BREVO_API_KEY / EMAIL_FROM missing)");
  }
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "SaveRound", email: process.env.EMAIL_FROM },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email failed (${response.status}): ${text}`);
  }
};

export const verificationEmailHtml = (name, link) => `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
    <h2>Welcome, ${name}!</h2>
    <p>Please confirm your email address to activate your SaveRound account.</p>
    <p><a href="${link}" style="background:#0a7d4f;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Verify my email</a></p>
    <p>Or paste this link in your browser:<br>${link}</p>
    <p style="color:#666">This link expires in 24 hours.</p>
  </div>`;
