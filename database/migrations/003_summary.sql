CREATE TABLE IF NOT EXISTS summary (
    id BIGSERIAL PRIMARY KEY,
    source_names TEXT[] NOT NULL,
    authors TEXT[] NOT NULL,
    ai_title TEXT,
    ai_description TEXT,
    urls TEXT[] NOT NULL,
    category TEXT NOT NULL,
    topic TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

