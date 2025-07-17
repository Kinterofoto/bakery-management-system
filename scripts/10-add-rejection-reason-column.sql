-- Add missing rejection_reason column to returns table
ALTER TABLE returns ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for better performance on rejection_reason queries
CREATE INDEX IF NOT EXISTS idx_returns_rejection_reason ON returns(rejection_reason) WHERE rejection_reason IS NOT NULL;