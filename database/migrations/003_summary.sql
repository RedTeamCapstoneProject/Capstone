CREATE TABLE summary (
    id SERIAL PRIMARY KEY,
    source_names VARCHAR(255),
    authors VARCHAR(255),
    AI_title TEXT,
    AI_description TEXT,
    urls VARCHAR(255),
    category TEXT,
    topic TEXT,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)