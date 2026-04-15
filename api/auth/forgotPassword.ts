import { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";
import crypto from "crypto";
import nodemailer from "nodemailer";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("supabase")
    ? { rejectUnauthorized: false }
    : false,
});

async function sendResetEmail(email: string, token: string): Promise<void> {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error("Email configuration is incomplete in environment variables");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const resetUrl = `${appUrl}/reset-password.html?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "Reset Your Real News Password",
    text: `You recently requested to reset your password for your Real News account. Visit this link to set a new password: ${resetUrl} — This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background-color:#3c3b3b;padding:28px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-family:'Raleway',Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">Real News</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 20px;">
            <h2 style="margin:0 0 16px;color:#3c3b3b;font-family:'Raleway',Helvetica,sans-serif;font-size:20px;font-weight:700;">Password Reset Request</h2>
            <p style="margin:0 0 24px;color:#51545e;font-size:16px;line-height:1.6;">
              We received a request to reset the password associated with this email address. Click the button below to set a new password.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr><td align="center" style="border-radius:6px;background-color:#743863;">
                <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:6px;">Reset Password</a>
              </td></tr>
            </table>
            <p style="margin:0 0 12px;color:#51545e;font-size:14px;line-height:1.5;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 24px;word-break:break-all;">
              <a href="${resetUrl}" style="color:#743863;font-size:14px;">${resetUrl}</a>
            </p>
            <p style="margin:0 0 8px;color:#51545e;font-size:14px;line-height:1.5;">This link will expire in <strong>1 hour</strong>.</p>
            <p style="margin:0;color:#51545e;font-size:14px;line-height:1.5;">If you did not request a password reset, no action is needed — your account is safe.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 32px;border-top:1px solid #eaeaec;text-align:center;">
            <p style="margin:0;color:#9a9ea6;font-size:12px;line-height:1.5;">&copy; ${new Date().getFullYear()} Real News. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);

    if (userRes.rows.length === 0) {
      return res.status(200).json({ message: "If an account with this email exists, a password reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      "UPDATE users SET password_reset_token = $1, reset_token_expires_at = $2 WHERE email = $3",
      [hashedToken, expiresAt, normalizedEmail]
    );

    try {
      await sendResetEmail(normalizedEmail, resetToken);
    } catch (sendError) {
      console.error("Failed to send reset email", sendError);
    }

    return res.status(200).json({ message: "If an account with this email exists, a password reset link has been sent." });
  } catch (error) {
    console.error("forgot-password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};