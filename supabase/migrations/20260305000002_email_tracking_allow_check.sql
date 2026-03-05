-- Allow 'CHECK' period in email_summary_tracking for on-demand email checks
ALTER TABLE public.email_summary_tracking
    DROP CONSTRAINT IF EXISTS email_summary_tracking_period_check;

ALTER TABLE public.email_summary_tracking
    ADD CONSTRAINT email_summary_tracking_period_check
    CHECK (period IN ('AM', 'PM', 'CHECK'));
