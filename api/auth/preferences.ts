import { VercelRequest, VercelResponse } from "@vercel/node";
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

const ALLOWED_PREFERENCES = [
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology",
];

function normalizePreferences(input: unknown): string[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const normalized = Array.from(
    new Set(
      input
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
    )
  );

  if (normalized.some((item) => !ALLOWED_PREFERENCES.includes(item))) {
    return null;
  }

  return normalized;
}

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
    const { userId, preferences } = req.body as {
      userId?: unknown;
      preferences?: unknown;
    };

    const parsedUserId = normalizeUserId(userId);

    if (!parsedUserId) {
      return res.status(400).json({ error: "A valid userId is required" });
    }

    const normalizedPreferences = normalizePreferences(preferences);

    if (normalizedPreferences === null) {
      return res.status(400).json({
        error: "preferences must be an array containing only: business, entertainment, general, health, science, sports, technology",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET preferences = $1
       WHERE id = $2
       RETURNING id, email, preferences`,
      [normalizedPreferences, parsedUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "Preferences saved",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Preferences update error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
