import path from "path";
import { pathToFileURL } from "url";
import pool from "./database";
import type { newsArticle as NewsArticle } from "../../AI/AIExportedFunctions/exportedFunctions.mts";

export type RowCell = {
  column: string;
  value: unknown;
};

export type RowAsCellObjects = RowCell[];

type NewsArticleDbRow = {
  source_id: string | null;
  source_name: string | null;
  author: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
  url_to_image: string | null;
  published_at: Date | string | null;
  content: string | null;
  category: string | null;
  topic: string | null;
};

function toRowCellObjects(row: Record<string, unknown>): RowAsCellObjects {
  return Object.entries(row).map(([column, value]) => ({ column, value }));
}

function getCellValue(cells: RowAsCellObjects, column: string): unknown {
  return cells.find((cell) => cell.column === column)?.value;
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

function toStringWithFallback(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function rowCellsToNewsArticle(cells: RowAsCellObjects): NewsArticle {
  const publishedRaw = getCellValue(cells, "published_at");
  const publishedAt =
    publishedRaw instanceof Date
      ? publishedRaw.toISOString()
      : toStringWithFallback(publishedRaw);

  return {
    source_id: toNullableString(getCellValue(cells, "source_id")),
    source_name: toStringWithFallback(getCellValue(cells, "source_name"), "Unknown Source"),
    author: toNullableString(getCellValue(cells, "author")),
    title: toStringWithFallback(getCellValue(cells, "title")),
    description: toStringWithFallback(getCellValue(cells, "description")),
    url: toStringWithFallback(getCellValue(cells, "url")),
    urlToImage: toNullableString(getCellValue(cells, "url_to_image")),
    publishedAt,
    content: toStringWithFallback(getCellValue(cells, "content")),
    category: toNullableString(getCellValue(cells, "category")) ?? undefined,
    topic: toNullableString(getCellValue(cells, "topic")) ?? undefined,
  };
}

async function importUserSummaryManager(): Promise<
  (
    articleObjArray: NewsArticle[],
    summaryType: string,
    userPrompt?: string
  ) => Promise<void>
> {
  const summaryModulePath = pathToFileURL(
    path.resolve(__dirname, "../../AI/userSummaries/userSummary.mts")
  ).href;

  const dynamicImport = new Function(
    "modulePath",
    "return import(modulePath);"
  ) as (modulePath: string) => Promise<{
    summaryManager: (
      articleObjArray: NewsArticle[],
      summaryType: string,
      userPrompt?: string
    ) => Promise<void>;
  }>;

  const module = await dynamicImport(summaryModulePath);


  return module.summaryManager;
}

async function fetchNewsArticlesAndUserSummarize(
  summaryType: "fiveWs" | "likeImFive" | "chatbot",
  userPrompt?: string
): Promise<{
  rowCount: number;
  rowsAsCellObjects: RowAsCellObjects[];
}> {
  const query = `
    SELECT
      source_id,
      source_name,
      author,
      title,
      description,
      url,
      url_to_image,
      published_at,
      content,
      category,
      topic
    FROM news_articles
    WHERE topic IN (
      SELECT topic
      FROM news_articles
      WHERE topic IS NOT NULL
      GROUP BY topic
      HAVING COUNT(*) >= 3
    )
    ORDER BY topic, published_at DESC NULLS LAST
  `;

  const result = await pool.query<NewsArticleDbRow>(query);
  const rowsAsCellObjects = result.rows.map((row) =>
    toRowCellObjects(row as unknown as Record<string, unknown>)
  );

  const articleObjArray = rowsAsCellObjects.map(rowCellsToNewsArticle);

  const byTopic = new Map<string, NewsArticle[]>();
  for (const article of articleObjArray) {
    const topic = article.topic ?? "";
    if (!byTopic.has(topic)) {
      byTopic.set(topic, []);
    }
    byTopic.get(topic)!.push(article);
  }

  const summaryManager = await importUserSummaryManager();
  for (const [topic, articles] of byTopic) {
    await summaryManager(articles, summaryType, userPrompt);
  }

  return {
    rowCount: result.rowCount ?? 0,
    rowsAsCellObjects,
  };
}

export async function fetchNewsArticlesAndFiveWs(userPrompt?: string): Promise<{
  rowCount: number;
  rowsAsCellObjects: RowAsCellObjects[];
}> {
  return fetchNewsArticlesAndUserSummarize("fiveWs", userPrompt);
}

