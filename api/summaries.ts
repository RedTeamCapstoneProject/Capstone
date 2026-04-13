import { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DATABASE_URL ?? "").includes("supabase")
    ? { rejectUnauthorized: false }
    : false,
});

type SummaryRow = {
  id: number;
  category: string | null;
  ai_title: string | null;
  ai_description: string | null;
  url_to_image: string | null;
  summary: string;
  "5ws": string | null;
  likeIm5: string | null;
  source_names: string[];
  authors: string[];
  urls: string[];
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeCategoryList(value: string | undefined): string[] {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0)
    )
  );
}

export default async (req: VercelRequest, res: VercelResponse) => {
  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  if (rawId) {
    const id = Number.parseInt(rawId, 10);

    const byIdResult = await pool.query<SummaryRow>(
      `SELECT id, category, ai_title, ai_description, url_to_image, summary, "5ws", "likeIm5", source_names, authors, urls
       FROM summary
       WHERE id = $1`,
      [id]
    );

    return res.status(200).json({ data: byIdResult.rows[0] });
  }

  const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const rawOffset = Array.isArray(req.query.offset) ? req.query.offset[0] : req.query.offset;
  const rawTopic = Array.isArray(req.query.topic) ? req.query.topic[0] : req.query.topic;
  const rawCategory = Array.isArray(req.query.category) ? req.query.category[0] : req.query.category;
  const rawCategories = Array.isArray(req.query.categories)
    ? req.query.categories[0]
    : req.query.categories;

  const limit = Math.min(parsePositiveInt(rawLimit, 10), 50);
  const offset = Math.max(parsePositiveInt(rawOffset, 0), 0);
  const topic = rawTopic?.trim();
  const category = rawCategory?.trim();
  const categories = normalizeCategoryList(rawCategories?.trim());

  const whereClauses: string[] = [];
  const params: Array<string | number | string[]> = [];

  if (topic) {
    params.push(topic);
    whereClauses.push(`LOWER(TRIM(topic)) = LOWER(TRIM($${params.length}::text))`);
  }

  if (category) {
    params.push(category);
    whereClauses.push(`LOWER(TRIM(category)) = LOWER(TRIM($${params.length}::text))`);
  } else if (categories.length > 0) {
    params.push(categories);
    whereClauses.push(`LOWER(TRIM(category)) = ANY($${params.length}::text[])`);
  }

  params.push(limit);
  const limitIndex = params.length;
  params.push(offset);
  const offsetIndex = params.length;

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const query = `
    SELECT id, category, ai_title, ai_description, url_to_image, summary, "5ws", "likeIm5", source_names, authors, urls
    FROM summary
    ${whereSql}
    ORDER BY created_at DESC, id DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const result = await pool.query<SummaryRow>(query, params);

  return res.status(200).json({
    data: result.rows,
    pagination: {
      limit,
      offset,
      count: result.rows.length,
    },
    filters: {
      topic: topic ?? null,
      category: category ?? null,
      categories,
    },
  });
};