CREATE TABLE IF NOT EXISTS newsarticles_old (
    id BIGSERIAL PRIMARY KEY,
    original_news_article_id BIGINT UNIQUE,
    source_id TEXT,
    source_name TEXT,
    author TEXT,
    title TEXT,
    description TEXT,
    url TEXT UNIQUE,
    url_to_image TEXT,
    published_at TIMESTAMPTZ,
    content TEXT,
    category TEXT,
    topic TEXT,
    created_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS newsarticles_old_topic_idx
ON newsarticles_old (topic);

CREATE INDEX IF NOT EXISTS newsarticles_old_archived_at_idx
ON newsarticles_old (archived_at DESC);
