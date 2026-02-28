-- Add phone column to users for Telegram vinculacion
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- Telegram user mappings: links telegram_chat_id → users.id
CREATE TABLE IF NOT EXISTS public.telegram_user_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    telegram_chat_id BIGINT NOT NULL UNIQUE,
    telegram_username TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_user_mappings_user_id
    ON public.telegram_user_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_user_mappings_chat_id
    ON public.telegram_user_mappings(telegram_chat_id);

-- Telegram conversations: state for multi-step flows (create/modify orders)
CREATE TABLE IF NOT EXISTS public.telegram_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id BIGINT NOT NULL,
    flow_type TEXT NOT NULL,          -- 'create_order', 'modify_order'
    state TEXT NOT NULL DEFAULT 'init',
    context JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_conversations_chat_id
    ON public.telegram_conversations(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_conversations_expires
    ON public.telegram_conversations(expires_at);

-- Telegram message history: conversational memory for OpenAI context
CREATE TABLE IF NOT EXISTS public.telegram_message_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id BIGINT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    intent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_message_history_chat_created
    ON public.telegram_message_history(telegram_chat_id, created_at DESC);
