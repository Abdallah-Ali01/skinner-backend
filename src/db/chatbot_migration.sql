-- =========================================
-- CHATBOT TABLES
-- Stores per-user AI chatbot conversations
-- =========================================

CREATE TABLE IF NOT EXISTS chatbot_conversation (
    conversation_id UUID PRIMARY KEY,
    user_id         VARCHAR(255) NOT NULL,
    user_role       VARCHAR(20)  NOT NULL CHECK (user_role IN ('patient', 'doctor')),
    title           VARCHAR(255),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chatbot_message (
    message_id      UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES chatbot_conversation(conversation_id) ON DELETE CASCADE,
    sender          VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant')),
    message_text    TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_chatbot_conv_user      ON chatbot_conversation(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_msg_conv       ON chatbot_message(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_msg_created_at ON chatbot_message(created_at);
