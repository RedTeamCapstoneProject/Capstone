import { Router, Request, Response } from "express";
import pool from "../database";

const router = Router();

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

router.get("/", async (req: Request, res: Response) => {
  const rawId = req.query.id as string | undefined;
  const id = rawId ? Number.parseInt(rawId, 10) : Number.NaN;

  if (Number.isFinite(id) && id > 0) {
    const byIdResult = await pool.query<SummaryRow>(
      `SELECT id, category, ai_title, ai_description, url_to_image, summary, "5ws", "likeIm5", source_names, authors, urls
       FROM summary
       WHERE id = $1`,
      [id]
    );

    return res.status(200).json({ data: byIdResult.rows[0] });
  }

  const limit = Math.min(parsePositiveInt(req.query.limit as string | undefined, 10), 50);
  const offset = Math.max(parsePositiveInt(req.query.offset as string | undefined, 0), 0);
  const topic = (req.query.topic as string | undefined)?.trim();
  const category = (req.query.category as string | undefined)?.trim();
  const categories = normalizeCategoryList((req.query.categories as string | undefined)?.trim());

  const whereClauses: string[] = [];
  const params: Array<string | number | string[]> = [];

  if (topic) {
    params.push(topic);
    whereClauses.push(`topic = $${params.length}`);
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
});

router.get("/:id", async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const normalizedId = Array.isArray(rawId) ? rawId[0] : rawId;
  const id = Number.parseInt(normalizedId, 10);

  const result = await pool.query<SummaryRow>(
    `SELECT id, category, ai_title, ai_description, url_to_image, summary, "5ws", "likeIm5", source_names, authors, urls
     FROM summary
     WHERE id = $1`,
    [id]
  );

  return res.status(200).json({ data: result.rows[0] });
});

export default router;