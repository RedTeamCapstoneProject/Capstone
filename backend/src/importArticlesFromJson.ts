import fs from "fs";
import path from "path";
import pool from "./database";

type ArticleInput = {
  source?: { id?: string | null; name?: string | null } | null;
  author?: string | null;
  title?: string | null;
  description?: string | null;
  url: string;
  urlToImage?: string | null;
  publishedAt?: string | null;
  content?: string | null;
  category?: string | null;
  topic?: string | null;
};

/**
 * Reads a JSON file containing an array of news articles (NewsAPI format) and
 * inserts them into the news_articles table. Rows whose URL already exists are skipped.
**/
export async function importArticlesFromJson(filePath: string): Promise<number> {
  const resolvedPath = path.resolve(filePath);
  const raw = fs.readFileSync(resolvedPath, "utf-8");
  const articles: ArticleInput[] = JSON.parse(raw);

  if (!Array.isArray(articles)) {
    throw new Error("JSON file must contain an array of article objects");
  }

  let inserted = 0;

  for (const article of articles) {
    if (!article.url) {
      console.warn("Skipping article with missing url:", article.title ?? "(no title)");
      continue;
    }

    const result = await pool.query(
      `INSERT INTO news_articles
        (source_id, source_name, author, title, description, url,
         url_to_image, published_at, content, category, topic)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (url) DO NOTHING`,
      [
        article.source?.id ?? null,
        article.source?.name ?? null,
        article.author ?? null,
        article.title ?? null,
        article.description ?? null,
        article.url,
        article.urlToImage ?? null,
        article.publishedAt ?? null,
        article.content ?? null,
        article.category ?? null,
        article.topic ?? null,
      ]
    );

    inserted += result.rowCount ?? 0;
  }

  return inserted;
}
