import { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcrypt";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("supabase")
    ? { rejectUnauthorized: false }
    : false,
});

function normalizeUserId(input: unknown): number | null {
  const parsed =
    typeof input === "number"
      ? input
      : typeof input === "string"
      ? Number.parseInt(input, 10)
      : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    console.log("Looking up user...");
    const result = await pool.query(
      "SELECT id, email, password_hash, preferences FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const user = result.rows[0];

    console.log("Comparing password...");
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: normalizeUserId(user.id),
        email: user.email,
        preferences: user.preferences ?? [],
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
