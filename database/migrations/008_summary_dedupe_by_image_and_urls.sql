DROP INDEX IF EXISTS summary_dedupe_key_uidx;

ALTER TABLE summary
DROP COLUMN IF EXISTS dedupe_key;

ALTER TABLE summary
ADD COLUMN dedupe_key TEXT;

UPDATE summary
SET dedupe_key = md5(
  coalesce(url_to_image, '') || '|' || coalesce(array_to_json(urls)::text, '[]')
);

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY dedupe_key
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM summary
)
DELETE FROM summary s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS summary_dedupe_key_uidx
ON summary (dedupe_key);
