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
    subject: "Real News Password Reset Request",
    text: `Real News Password Reset Request

We received a request to reset the password for your account.

Use the link below to choose a new password. This link will expire in 1 hour:
${resetUrl}

If you did not request a password reset, no further action is required and you can safely ignore this email.

This is an automated message. Please do not reply to this email.`,
    html: `
      <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
        Reset your Real News password. This secure link expires in 1 hour.
      </div>
      <div style="margin: 0; padding: 24px; background-color: #f4f6f8; font-family: Arial, sans-serif; color: #1f2937;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
          <div style="padding: 24px 28px; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb;">
            <h2 style="margin: 0; font-size: 22px; line-height: 1.3; color: #111827;">Password Reset Request</h2>
          </div>

          <div style="padding: 24px 28px;">
            <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
              We received a request to reset the password for your account.
            </p>
            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6;">
              Click the button below to choose a new password. For security, this link will expire in <strong>1 hour</strong>.
            </p>

            <a href="${resetUrl}" style="display: inline-block; padding: 12px 22px; background-color: #0d6efd; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 6px;">
              Reset Your Password
            </a>

            <p style="margin: 24px 0 8px; font-size: 14px; line-height: 1.6; color: #4b5563;">
              If the button does not work, copy and paste this URL into your browser:
            </p>
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #2563eb; word-break: break-all;">
              ${resetUrl}
            </p>

            <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
              If you did not request a password reset, no further action is required and you can safely ignore this email.
            </p>
          </div>

          <div style="padding: 16px 28px; border-top: 1px solid #e5e7eb; background-color: #f9fafb; font-size: 12px; line-height: 1.5; color: #6b7280;">
            This is an automated message. Please do not reply to this email.
          </div>
        </div>
      </div>
    `,
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