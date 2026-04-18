ALTER TABLE users
ADD COLUMN IF NOT EXISTS chatbot_calls INT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'chatbot_calls'
          AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE users
        ALTER COLUMN chatbot_calls DROP DEFAULT;

        ALTER TABLE users
        ALTER COLUMN chatbot_calls TYPE INT
        USING COALESCE(chatbot_calls[1], 20);
    END IF;
END $$;

UPDATE users
SET chatbot_calls = 20
WHERE chatbot_calls IS NULL;

ALTER TABLE users
ALTER COLUMN chatbot_calls SET DEFAULT 20,
ALTER COLUMN chatbot_calls SET NOT NULL;
