CREATE TABLE IF NOT EXISTS news_articles (
    id BIGSERIAL PRIMARY KEY,
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
