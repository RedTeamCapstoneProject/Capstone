DROP INDEX IF EXISTS summary_dedupe_key_uidx;

ALTER TABLE summary
DROP COLUMN IF EXISTS dedupe_key;

DELETE FROM summary older
USING summary newer
WHERE older.id <> newer.id
  AND older.urls && newer.urls
  AND (
    older.created_at < newer.created_at
    OR (older.created_at = newer.created_at AND older.id < newer.id)
  );

CREATE INDEX IF NOT EXISTS summary_urls_gin_idx
ON summary USING GIN (urls);
