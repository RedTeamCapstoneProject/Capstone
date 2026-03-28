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

// Parse request body in multiple formats: JSON or URL-encoded form data.
// This allows the endpoint to accept both fetch(body: JSON.stringify(...)) and traditional form POSTs.
function normalizeBody(body: unknown): Record<string, unknown> {
  if (!body) {
    return {};
  }

  if (typeof body === "object") {
    return body as Record<string, unknown>;
  }

  if (typeof body === "string") {
    const trimmed = body.trim();

    if (!trimmed) {
      return {};
    }

    // Try JSON first.
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // Fallback to URL-encoded parsing.
    }

    // Parse URL-encoded form data (e.g., 'token=xyz&password=123').
    const params = new URLSearchParams(trimmed);
    const output: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) {
      output[key] = value;
    }
    return output;
  }

  return {};
}

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
    // Parse body supporting both JSON and URL-encoded payloads.
    const parsedBody = normalizeBody(req.body);
    const { token, password, newPassword } = parsedBody;
    // Accept either 'password' or 'newPassword' field name for compatibility.
    const submittedPassword = password ?? newPassword;

    if (!token || !submittedPassword || typeof token !== "string" || typeof submittedPassword !== "string") {
      return res.status(400).json({ error: "Token and password are required" });
    }

    if (submittedPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Hash the token using SHA256 and look up in database.
    // Tokens are stored hashed in the DB for security.
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date();

    // Query for valid token that hasn't expired.
    const query = await pool.query(
      "SELECT id FROM users WHERE password_reset_token = $1 AND reset_token_expires_at > $2",
      [hashedToken, now]
    );

    if (query.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const userId = query.rows[0].id;
    // Hash the new password with bcrypt before storing.
    const passwordHash = await bcrypt.hash(submittedPassword, 10);

    // Update password and clear reset token/expiry.
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