CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    preferences TEXT[] NOT NULL DEFAULT ARRAY['business','entertainment','general','health','science','sports','technology']::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    password_reset_token TEXT,
    reset_token_expires_at TIMESTAMPTZ
);