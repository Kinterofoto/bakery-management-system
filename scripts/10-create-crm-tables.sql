-- CRM Tables Creation Script
-- Creates tables for managing sales pipeline, activities, and lead tracking

-- Lead Activities Table - Track all interactions with leads/clients
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'call', 'email', 'meeting', 'note', 'proposal', 'follow_up'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  estimated_value DECIMAL(12,2), -- Expected deal value
  actual_value DECIMAL(12,2), -- Actual deal value if closed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline Stages Configuration Table
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  stage_order INTEGER NOT NULL,
  probability INTEGER DEFAULT 0, -- Probability percentage (0-100)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Opportunities Table - Track potential deals
CREATE TABLE IF NOT EXISTS sales_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pipeline_stage_id UUID REFERENCES pipeline_stages(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_value DECIMAL(12,2),
  expected_close_date DATE,
  actual_close_date DATE,
  probability INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'won', 'lost', 'paused'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Sources Table - Track where leads come from
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add lead_source_id to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES lead_sources(id),
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lead_activities_client_id ON lead_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_user_id ON lead_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_scheduled_date ON lead_activities(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_client_id ON sales_opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_assigned_user ON sales_opportunities(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_stage ON sales_opportunities(pipeline_stage_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_user ON clients(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_lead_source ON clients(lead_source_id);

-- Insert default pipeline stages
INSERT INTO pipeline_stages (name, description, stage_order, probability) VALUES
('Prospecto', 'Cliente potencial identificado', 1, 10),
('Contactado', 'Primer contacto realizado', 2, 25),
('Calificado', 'Lead calificado y con interés confirmado', 3, 40),
('Propuesta', 'Propuesta comercial enviada', 4, 60),
('Negociación', 'En proceso de negociación', 5, 80),
('Ganado', 'Venta cerrada exitosamente', 6, 100),
('Perdido', 'Oportunidad perdida', 7, 0);

-- Insert default lead sources
INSERT INTO lead_sources (name, description) VALUES
('Referido', 'Cliente referido por otro cliente'),
('Website', 'Contacto a través del sitio web'),
('Redes Sociales', 'Contacto a través de redes sociales'),
('Llamada Fría', 'Prospección telefónica'),
('Evento', 'Contacto en evento o feria'),
('Email Marketing', 'Campaña de email marketing'),
('Publicidad Online', 'Publicidad digital'),
('Otros', 'Otras fuentes no especificadas');

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (drop if exist first to avoid conflicts)
DROP TRIGGER IF EXISTS update_lead_activities_updated_at ON lead_activities;
DROP TRIGGER IF EXISTS update_sales_opportunities_updated_at ON sales_opportunities;

CREATE TRIGGER update_lead_activities_updated_at BEFORE UPDATE ON lead_activities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_sales_opportunities_updated_at BEFORE UPDATE ON sales_opportunities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();