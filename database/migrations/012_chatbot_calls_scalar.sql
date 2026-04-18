DO $$
DECLARE
    chatbot_calls_type TEXT;
BEGIN
    SELECT data_type
    INTO chatbot_calls_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'chatbot_calls';

    IF chatbot_calls_type = 'ARRAY' THEN
        ALTER TABLE users
        ALTER COLUMN chatbot_calls DROP DEFAULT;

        ALTER TABLE users
        ALTER COLUMN chatbot_calls TYPE INT
        USING COALESCE(chatbot_calls[1], 20);
    ELSIF chatbot_calls_type IS NULL THEN
        ALTER TABLE users
        ADD COLUMN chatbot_calls INT NOT NULL DEFAULT 20;
    END IF;

    ALTER TABLE users
    ALTER COLUMN chatbot_calls SET DEFAULT 20,
    ALTER COLUMN chatbot_calls SET NOT NULL;
END $$;
