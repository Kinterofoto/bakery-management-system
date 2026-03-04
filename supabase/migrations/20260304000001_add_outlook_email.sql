-- Add outlook_email field to users for email integration
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS outlook_email TEXT;
CREATE INDEX IF NOT EXISTS idx_users_outlook_email ON public.users(outlook_email);

-- Seed test user (nicolas@pastry.com = super_admin)
UPDATE public.users SET outlook_email = 'nquintero@pastrychef.com.co'
WHERE email = 'nicolas@pastry.com';

-- Track email summary runs to avoid duplicate emails between AM/PM summaries
CREATE TABLE IF NOT EXISTS public.email_summary_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_summarized_at TIMESTAMPTZ NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('AM', 'PM')),
    email_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_summary_tracking_user
    ON public.email_summary_tracking(user_id, period);
