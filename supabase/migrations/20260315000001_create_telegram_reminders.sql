-- Telegram reminders table for scheduled notifications
CREATE TABLE IF NOT EXISTS telegram_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    telegram_chat_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    recurrence TEXT, -- null=one-time, 'daily', 'weekdays', 'weekly:1' (Mon), 'weekly:3' (Wed), etc.
    next_run_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the scheduler job: find due reminders quickly
CREATE INDEX idx_telegram_reminders_due
    ON telegram_reminders (next_run_at)
    WHERE status = 'active';

-- Index for listing user reminders
CREATE INDEX idx_telegram_reminders_user
    ON telegram_reminders (user_id, status);
