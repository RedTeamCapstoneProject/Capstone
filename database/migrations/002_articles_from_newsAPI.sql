CREATE TABLE news_articles (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(255),
    source_name VARCHAR(255),
    author VARCHAR(255),
    title TEXT,
    description TEXT,
    url TEXT UNIQUE,
    url_to_image TEXT,
    published_at TIMESTAMPTZ,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);