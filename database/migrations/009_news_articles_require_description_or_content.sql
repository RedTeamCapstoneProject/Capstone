DELETE FROM news_articles
WHERE description IS NULL
  AND content IS NULL;

ALTER TABLE news_articles
DROP CONSTRAINT IF EXISTS news_articles_description_or_content_chk;

CREATE OR REPLACE FUNCTION delete_news_article_if_empty()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM news_articles WHERE id = NEW.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS news_articles_delete_empty_after_write_trg ON news_articles;

CREATE TRIGGER news_articles_delete_empty_after_write_trg
AFTER INSERT
ON news_articles
FOR EACH ROW
WHEN (NEW.description IS NULL AND NEW.content IS NULL)
EXECUTE FUNCTION delete_news_article_if_empty();
