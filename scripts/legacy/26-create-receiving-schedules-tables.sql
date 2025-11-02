-- Create receiving schedules module tables
-- This module handles client and branch receiving time schedules

-- Receiving schedules - Regular weekly schedules
CREATE TABLE IF NOT EXISTS receiving_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
  timezone VARCHAR(50) DEFAULT 'America/Bogota',
  applied_template_id UUID, -- Reference to templates table
  metadata JSONB DEFAULT '{}', -- For UI colors, labels, priority, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure either client_id or branch_id is set, but not both null
  CONSTRAINT receiving_schedules_client_or_branch_check 
    CHECK ((client_id IS NOT NULL AND branch_id IS NULL) OR 
           (client_id IS NULL AND branch_id IS NOT NULL)),
           
  -- Basic time validation
  CONSTRAINT receiving_schedules_time_check 
    CHECK (start_time < end_time)
);

-- Receiving exceptions - Specific date overrides
CREATE TABLE IF NOT EXISTS receiving_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('blocked', 'open_extra', 'special_hours')),
  start_time TIME, -- NULL for 'blocked' type
  end_time TIME,   -- NULL for 'blocked' type
  note TEXT,
  source VARCHAR(20) DEFAULT 'user' CHECK (source IN ('user', 'imported', 'holiday_api')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure either client_id or branch_id is set
  CONSTRAINT receiving_exceptions_client_or_branch_check 
    CHECK ((client_id IS NOT NULL AND branch_id IS NULL) OR 
           (client_id IS NULL AND branch_id IS NOT NULL)),
           
  -- Ensure time fields are consistent with type
  CONSTRAINT receiving_exceptions_time_check 
    CHECK (
      (type = 'blocked' AND start_time IS NULL AND end_time IS NULL) OR
      (type IN ('open_extra', 'special_hours') AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    )
);

-- Receiving patterns - Recurring rules (RRULE format)
CREATE TABLE IF NOT EXISTS receiving_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- Human readable name like "Last Friday of Month"
  rrule TEXT NOT NULL, -- RFC 5545 RRULE format
  effect_type VARCHAR(20) NOT NULL CHECK (effect_type IN ('block', 'open_extra')),
  start_time TIME,
  end_time TIME,
  note TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure either client_id or branch_id is set
  CONSTRAINT receiving_patterns_client_or_branch_check 
    CHECK ((client_id IS NOT NULL AND branch_id IS NULL) OR 
           (client_id IS NULL AND branch_id IS NOT NULL)),
           
  -- Time validation when both times are present
  CONSTRAINT receiving_patterns_time_check 
    CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time)
);

-- Templates - Reusable schedule configurations
CREATE TABLE IF NOT EXISTS receiving_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  payload JSONB NOT NULL, -- JSON array of schedule objects by day
  created_by UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT FALSE, -- If true, available to all users
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs for receiving schedules changes
CREATE TABLE IF NOT EXISTS receiving_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'bulk_update'
  target_table VARCHAR(50) NOT NULL, -- 'receiving_schedules', 'receiving_exceptions', etc.
  target_id UUID NOT NULL,
  before_data JSONB,
  after_data JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_receiving_schedules_client ON receiving_schedules(client_id);
CREATE INDEX IF NOT EXISTS idx_receiving_schedules_branch ON receiving_schedules(branch_id);
CREATE INDEX IF NOT EXISTS idx_receiving_schedules_day ON receiving_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_receiving_schedules_template ON receiving_schedules(applied_template_id);

CREATE INDEX IF NOT EXISTS idx_receiving_exceptions_client ON receiving_exceptions(client_id);
CREATE INDEX IF NOT EXISTS idx_receiving_exceptions_branch ON receiving_exceptions(branch_id);
CREATE INDEX IF NOT EXISTS idx_receiving_exceptions_date ON receiving_exceptions(exception_date);

CREATE INDEX IF NOT EXISTS idx_receiving_patterns_client ON receiving_patterns(client_id);
CREATE INDEX IF NOT EXISTS idx_receiving_patterns_branch ON receiving_patterns(branch_id);
CREATE INDEX IF NOT EXISTS idx_receiving_patterns_active ON receiving_patterns(is_active);

CREATE INDEX IF NOT EXISTS idx_receiving_templates_public ON receiving_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_receiving_templates_created_by ON receiving_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_receiving_audit_logs_user ON receiving_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_receiving_audit_logs_target ON receiving_audit_logs(target_table, target_id);

-- Unique constraint to prevent multiple overlapping schedules
-- (We'll handle overlap validation in the application layer for more flexible control)
CREATE UNIQUE INDEX IF NOT EXISTS idx_receiving_schedules_unique 
ON receiving_schedules(
  COALESCE(client_id, branch_id),
  day_of_week,
  start_time,
  end_time
);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_receiving_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_receiving_schedules_updated_at ON receiving_schedules;
CREATE TRIGGER update_receiving_schedules_updated_at
  BEFORE UPDATE ON receiving_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_receiving_updated_at_column();

DROP TRIGGER IF EXISTS update_receiving_exceptions_updated_at ON receiving_exceptions;
CREATE TRIGGER update_receiving_exceptions_updated_at
  BEFORE UPDATE ON receiving_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_receiving_updated_at_column();

DROP TRIGGER IF EXISTS update_receiving_patterns_updated_at ON receiving_patterns;
CREATE TRIGGER update_receiving_patterns_updated_at
  BEFORE UPDATE ON receiving_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_receiving_updated_at_column();

DROP TRIGGER IF EXISTS update_receiving_templates_updated_at ON receiving_templates;
CREATE TRIGGER update_receiving_templates_updated_at
  BEFORE UPDATE ON receiving_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_receiving_updated_at_column();

-- Function to get effective schedule for a client/branch on a specific date
-- Fixed parameter order: required parameters first, then optional ones
CREATE OR REPLACE FUNCTION get_effective_receiving_schedule(
  p_date DATE,
  p_client_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
  schedule_type TEXT,
  start_time TIME,
  end_time TIME,
  status TEXT,
  note TEXT
) AS $$
DECLARE
  day_of_week_num INTEGER;
BEGIN
  -- Get day of week (0=Sunday, 6=Saturday)
  day_of_week_num := EXTRACT(DOW FROM p_date);
  
  -- Priority 1: Check for exceptions on this specific date
  RETURN QUERY
  SELECT 
    'exception' as schedule_type,
    e.start_time,
    e.end_time,
    CASE 
      WHEN e.type = 'blocked' THEN 'unavailable'
      ELSE 'available'
    END as status,
    e.note
  FROM receiving_exceptions e
  WHERE 
    ((p_client_id IS NOT NULL AND e.client_id = p_client_id) OR
     (p_branch_id IS NOT NULL AND e.branch_id = p_branch_id))
    AND e.exception_date = p_date
  ORDER BY e.created_at DESC
  LIMIT 1;
  
  -- If exception found, return early
  IF FOUND THEN
    RETURN;
  END IF;
  
  -- Priority 2: Check regular weekly schedules
  RETURN QUERY
  SELECT 
    'regular' as schedule_type,
    s.start_time,
    s.end_time,
    s.status,
    s.metadata->>'note' as note
  FROM receiving_schedules s
  WHERE 
    ((p_client_id IS NOT NULL AND s.client_id = p_client_id) OR
     (p_branch_id IS NOT NULL AND s.branch_id = p_branch_id))
    AND s.day_of_week = day_of_week_num
  ORDER BY s.start_time;
  
  -- If no schedules found, return default unavailable
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'default' as schedule_type,
      NULL::TIME as start_time,
      NULL::TIME as end_time,
      'unavailable' as status,
      'No schedule configured' as note;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to validate time slot overlaps (for use in application)
-- Fixed parameter order: required parameters first, then optional ones
CREATE OR REPLACE FUNCTION check_schedule_overlap(
  p_day_of_week INTEGER,
  p_start_time TIME,
  p_end_time TIME,
  p_client_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  overlap_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO overlap_count
  FROM receiving_schedules
  WHERE 
    ((p_client_id IS NOT NULL AND client_id = p_client_id) OR
     (p_branch_id IS NOT NULL AND branch_id = p_branch_id))
    AND day_of_week = p_day_of_week
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    );
    
  RETURN overlap_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Sample template for testing
INSERT INTO receiving_templates (name, description, payload, is_public) VALUES
(
  'Horario Comercial Estándar',
  'Lunes a Viernes 8:00-17:00, Sábados 8:00-12:00',
  '[
    {"day": 1, "slots": [{"start": "08:00", "end": "17:00", "status": "available"}]},
    {"day": 2, "slots": [{"start": "08:00", "end": "17:00", "status": "available"}]},
    {"day": 3, "slots": [{"start": "08:00", "end": "17:00", "status": "available"}]},
    {"day": 4, "slots": [{"start": "08:00", "end": "17:00", "status": "available"}]},
    {"day": 5, "slots": [{"start": "08:00", "end": "17:00", "status": "available"}]},
    {"day": 6, "slots": [{"start": "08:00", "end": "12:00", "status": "available"}]}
  ]',
  true
) ON CONFLICT DO NOTHING;