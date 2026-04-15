import chokidar from 'chokidar';
import path from "path";
import pool from "./database";
import fs from "fs";

const targetFile = path.resolve("outputJSONs/summarizedJSON/summarizedTopic.json");

console.log(`checking for stuff at: ${targetFile}`);

interface SummaryRow {
  source_names: string[];
  authors: string[];
  ai_title: string;
  ai_description: string;
  urls: string[];
  url_to_image?: string | null;
  category?: string;
  topic?: string;
  summary: string;
  "5ws"?: string | null;
  likeIm5?: string | null;
}

async function tempreadJSON(filePath: string): Promise<SummaryRow[]> {
  const rawData = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(rawData);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.summaries)) {
    return data.summaries;
  }

  return [data];
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

  if (jsonFiles.length === 0) {
    throw new Error(`No JSON files found in folder: ${resolvedFolder}`);
  }

  return jsonFiles[0].fullPath;
}

export async function summaryJsonToDB(
  filePath = "outputJSONs/summarizedJSON/summarizedTopic.json"
): Promise<number> {
  const resolvedPath = path.resolve(filePath);
  const summaries: SummaryRow[] = await tempreadJSON(resolvedPath);

  let inserted = 0;

  for (const summary of summaries) {
    const result = await pool.query(
      `WITH removed AS (
         DELETE FROM summary
         WHERE dedupe_key = md5(
           coalesce($6::text, '') || '|' || coalesce(array_to_json($5::text[])::text, '[]')
         )
       )
       INSERT INTO summary
         (source_names, authors, ai_title, ai_description, urls,
          url_to_image, category, topic, summary, "5ws", "likeIm5", dedupe_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         md5(coalesce($6::text, '') || '|' || coalesce(array_to_json($5::text[])::text, '[]')))`,
      [
        summary.source_names,
        summary.authors,
        summary.ai_title ?? null,
        summary.ai_description ?? null,
        summary.urls,
        summary.url_to_image ?? null,
        summary.category ?? "unknown",
        summary.topic ?? "unknown",
        summary.summary,
        summary["5ws"] ?? null,
        summary.likeIm5 ?? null,
      ]
    );

    inserted += result.rowCount ?? 0;
  }

  return inserted;
}

export async function summaryFolderToDB(
  folderPath = "outputJSONs/summarizedJSON",
  preferredFileName?: string
): Promise<number> {
  const jsonPath = resolveJsonFromFolder(folderPath, preferredFileName);
  return summaryJsonToDB(jsonPath);
}

