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

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Database URL:", process.env.DATABASE_URL ? "Set" : "Not set");
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    console.log("Checking existing user...");
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Account already exists" });
    }

    console.log("Hashing password...");
    const passwordHash = await bcrypt.hash(password, 10);

    console.log("Inserting user...");
    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      message: "Account created",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Signup error details:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    });
  }
};