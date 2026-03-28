import { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import crypto from "crypto";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("supabase")
    ? { rejectUnauthorized: false }
    : false,
});

export default async (req: VercelRequest, res: VercelResponse) => {
  // Allow preflight requests from browser/network probes.
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, password, newPassword } = req.body;
    const submittedPassword = password ?? newPassword;

    if (!token || !submittedPassword || typeof token !== "string" || typeof submittedPassword !== "string") {
      return res.status(400).json({ error: "Token and password are required" });
    }

    if (submittedPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Compare hash(token) against stored token hash and enforce expiry.
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date();

    const query = await pool.query(
      "SELECT id FROM users WHERE password_reset_token = $1 AND reset_token_expires_at > $2",
      [hashedToken, now]
    );

    if (query.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const userId = query.rows[0].id;
    // Hash the new password before persisting it.
    const passwordHash = await bcrypt.hash(submittedPassword, 10);

    await pool.query(
      "UPDATE users SET password_hash = $1, password_reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2",
      [passwordHash, userId]
    );

    return res.status(200).json({ message: "Password has been updated" });
  } catch (error) {
    console.error("reset-password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};