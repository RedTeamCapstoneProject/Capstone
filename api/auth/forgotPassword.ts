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
    subject: "Password reset request",
    text: `You requested a password reset. Visit this link to reset your password: ${resetUrl}`,
    html: `<p>You requested a password reset. <a href="${resetUrl}">Click here to reset your password</a>.</p><p>If you did not request this, ignore this email.</p>`,
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