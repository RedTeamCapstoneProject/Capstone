import fs from "fs";
import path from "path";
import pool from "./database";

interface newsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string;
  category?: string | null;
  topic?: string | null;
}


async function tempreadJSON(filePath: string): Promise<newsArticle[]> {
  const rawData = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(rawData);
  return Array.isArray(data) ? data : data.articles;
}

function resolveJsonFromFolder(folderPath: string, preferredFileName?: string): string {
  const resolvedFolder = path.resolve(folderPath);

  if (preferredFileName) {
    const explicitPath = path.join(resolvedFolder, preferredFileName);
    return explicitPath;
  }

  const jsonFiles = fs
    .readdirSync(resolvedFolder)
    .filter((name) => name.toLowerCase().endsWith(".json"))
    .map((name) => ({
      name,
      fullPath: path.join(resolvedFolder, name),
      mtimeMs: fs.statSync(path.join(resolvedFolder, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return jsonFiles[0].fullPath;
}

/**
 * Reads a JSON file containing an array of news articles (NewsAPI format) and
 * inserts them into the news_articles table. Rows whose URL already exists are skipped.
**/
export async function importArticlesFromJson(filePath: string): Promise<number> {
  const resolvedPath = path.resolve(filePath);
  const articles: newsArticle[] = await tempreadJSON(resolvedPath);

  let inserted = 0;

  for (const article of articles) {
    const result = await pool.query(
      `INSERT INTO news_articles
        (source_id, source_name, author, title, description, url,
         url_to_image, published_at, content, category, topic)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (url) DO NOTHING`,
      [
        article.source?.id ?? null,
        article.source?.name ?? null,
        article.author ?? "Unknown Author",
        article.title ?? null,
        article.description ?? null,
        article.url,
        article.urlToImage ?? null,
        article.publishedAt ?? null,
        article.content ?? null,
        article.category ?? "unknown",
        article.topic ?? "unknown",
      ]
    );

    inserted += result.rowCount ?? 0;
  }

  return inserted;
}

export async function importArticlesFromJsonFolder(
  folderPath = "outputJSONs/JSONAfterTopic",
  preferredFileName?: string
): Promise<number> {
  const jsonPath = resolveJsonFromFolder(folderPath, preferredFileName);
  return importArticlesFromJson(jsonPath);
}
