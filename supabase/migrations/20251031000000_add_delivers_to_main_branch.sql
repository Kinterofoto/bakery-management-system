-- Add delivers_to_main_branch column to client_config table
ALTER TABLE client_config
ADD COLUMN IF NOT EXISTS delivers_to_main_branch BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN client_config.delivers_to_main_branch IS 'Indica si las entregas al cliente se realizan en su CEDI principal';
