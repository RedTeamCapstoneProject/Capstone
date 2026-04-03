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
	// Convert one SQL row into the requested "array of cell objects" format.
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
	// Rehydrate the cell-object row back into the shape expected by summaryManager.
	console.log("test")
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


async function importSummaryManager(): Promise<
	(articleObjArray: NewsArticle[],numberOfTopics:number) => Promise<void>
> {
	// Resolve the .mts summary module from backend/src at runtime.
	const summaryModulePath = pathToFileURL(
		path.resolve(__dirname, "../../AI/summary/genericSummary.mts")
	).href;

	// Use dynamic import to bridge CJS backend code with the ESM .mts module.
	const dynamicImport = new Function(
		"modulePath",
		"return import(modulePath);"
	) as (modulePath: string) => Promise<{
		summaryManager: (articleObjArray: NewsArticle[],numberOfTopics:number) => Promise<void>;
	}>;

	const module = await dynamicImport(summaryModulePath);

	if (typeof module.summaryManager !== "function") {
		throw new Error("summaryManager export was not found in AI/summary/genericSummary.mts");
	}

	return module.summaryManager;
}




export async function fetchNewsArticlesAndSummarize(): Promise<{
	rowCount: number;
	rowsAsCellObjects: RowAsCellObjects[];
}> {
	// Only pull articles whose topic appears 3 or more times in the table.
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

	// Map rows to article objects and group by topic for per-topic summarization.
	const articleObjArray = rowsAsCellObjects.map(rowCellsToNewsArticle);

	const byTopic = new Map<string, NewsArticle[]>();
	for (const article of articleObjArray) {
		const topic = article.topic ?? "";
		if (!byTopic.has(topic)) byTopic.set(topic, []);
		byTopic.get(topic)!.push(article);
	}

	// Call summaryManager once per qualifying topic group.
	const summaryManager = await importSummaryManager();
	for (const [topic, articles] of byTopic) {
		console.log(`Summarizing topic "${topic}" (${articles.length} articles)`);
		await summaryManager(articles,byTopic.size);
		
	}

	return {
		rowCount: result.rowCount ?? 0,
		rowsAsCellObjects,
	};
}

fetchNewsArticlesAndSummarize()
  .then(() => console.log("Done!"))
  .catch(err => console.error(err));
