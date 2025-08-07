-- Script to add lead_status column to clients table for CRM functionality
-- This enables tracking of lead stages in the sales pipeline

-- Add lead_status column to clients table
ALTER TABLE clients 
ADD COLUMN lead_status VARCHAR(50) DEFAULT 'prospect';

-- Create index for better performance on lead_status queries
CREATE INDEX idx_clients_lead_status ON clients(lead_status);

-- Update existing clients to have a default lead status
UPDATE clients 
SET lead_status = 'client' 
WHERE id IN (
  SELECT DISTINCT client_id 
  FROM orders 
  WHERE status IN ('delivered', 'partially_delivered')
);

-- Comment on the column for documentation
COMMENT ON COLUMN clients.lead_status IS 'Lead status for CRM pipeline: prospect, contacted, qualified, proposal, negotiation, closed_won, closed_lost, client';