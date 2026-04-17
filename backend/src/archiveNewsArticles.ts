import pool from "./database";

export async function archiveAllNewsArticles(): Promise<{
  movedCount: number;
  deletedCount: number;
}> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const movedResult = await client.query(
      `INSERT INTO newsarticles_old (
         original_news_article_id,
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
         topic,
         created_at,
         archived_at
       )
       SELECT
         id,
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
         topic,
         created_at,
         CURRENT_TIMESTAMP
       FROM news_articles
       ON CONFLICT (url) DO UPDATE
       SET
         original_news_article_id = EXCLUDED.original_news_article_id,
         source_id = EXCLUDED.source_id,
         source_name = EXCLUDED.source_name,
         author = EXCLUDED.author,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         url_to_image = EXCLUDED.url_to_image,
         published_at = EXCLUDED.published_at,
         content = EXCLUDED.content,
         category = EXCLUDED.category,
         topic = EXCLUDED.topic,
         created_at = EXCLUDED.created_at,
         archived_at = CURRENT_TIMESTAMP`
    );

    const deletedResult = await client.query(`DELETE FROM news_articles`);

    await client.query("COMMIT");

    return {
      movedCount: movedResult.rowCount ?? 0,
      deletedCount: deletedResult.rowCount ?? 0,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
