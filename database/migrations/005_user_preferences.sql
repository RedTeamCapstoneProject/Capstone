ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferences TEXT[] NOT NULL
DEFAULT ARRAY['business','entertainment','general','health','science','sports','technology']::TEXT[];
