-- Create store visits module schema and tables
-- This module allows field staff to record store visits and product evaluations

-- Create dedicated schema for visits module
CREATE SCHEMA IF NOT EXISTS visitas;

-- Main visits table
CREATE TABLE IF NOT EXISTS visitas.store_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  branch_name_custom TEXT, -- Free text if branch doesn't exist in DB
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  operator_name VARCHAR(255), -- Store operator name
  operator_phone VARCHAR(50), -- Store operator phone
  general_comments TEXT,
  average_score DECIMAL(3,2), -- Calculated average score (1.00 to 5.00)
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_branch CHECK (
    (branch_id IS NOT NULL AND branch_name_custom IS NULL) OR
    (branch_id IS NULL AND branch_name_custom IS NOT NULL)
  )
);

-- Product evaluations per visit
CREATE TABLE IF NOT EXISTS visitas.product_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES visitas.store_visits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  has_stock BOOLEAN NOT NULL DEFAULT false,
  -- Scores from 1 to 5 (only filled if has_stock = true)
  score_baking INTEGER CHECK (score_baking >= 1 AND score_baking <= 5),
  score_display INTEGER CHECK (score_display >= 1 AND score_display <= 5),
  score_presentation INTEGER CHECK (score_presentation >= 1 AND score_presentation <= 5),
  score_taste INTEGER CHECK (score_taste >= 1 AND score_taste <= 5), -- Optional
  storage_temperature DECIMAL(5,2), -- Optional, in celsius
  score_staff_training INTEGER CHECK (score_staff_training >= 1 AND score_staff_training <= 5),
  score_baking_params INTEGER CHECK (score_baking_params >= 1 AND score_baking_params <= 5),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(visit_id, product_id)
);

-- Photos associated with visits
CREATE TABLE IF NOT EXISTS visitas.visit_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES visitas.store_visits(id) ON DELETE CASCADE,
  product_evaluation_id UUID REFERENCES visitas.product_evaluations(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(50) NOT NULL CHECK (photo_type IN ('product', 'general')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_visits_client ON visitas.store_visits(client_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_branch ON visitas.store_visits(branch_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_date ON visitas.store_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_store_visits_created_by ON visitas.store_visits(created_by);
CREATE INDEX IF NOT EXISTS idx_product_evaluations_visit ON visitas.product_evaluations(visit_id);
CREATE INDEX IF NOT EXISTS idx_product_evaluations_product ON visitas.product_evaluations(product_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_visit ON visitas.visit_photos(visit_id);

-- Function to calculate average score for a visit
CREATE OR REPLACE FUNCTION visitas.calculate_visit_average_score(p_visit_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  avg_score DECIMAL(3,2);
BEGIN
  -- Calculate average of all non-null scores from products that have stock
  SELECT
    ROUND(AVG(score)::numeric, 2)
  INTO avg_score
  FROM (
    SELECT
      (
        COALESCE(score_baking, 0) +
        COALESCE(score_display, 0) +
        COALESCE(score_presentation, 0) +
        COALESCE(score_taste, 0) +
        COALESCE(score_staff_training, 0) +
        COALESCE(score_baking_params, 0)
      )::DECIMAL /
      (
        CASE WHEN score_baking IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN score_display IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN score_presentation IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN score_taste IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN score_staff_training IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN score_baking_params IS NOT NULL THEN 1 ELSE 0 END
      ) as score
    FROM visitas.product_evaluations
    WHERE visit_id = p_visit_id
      AND has_stock = true
      AND (
        score_baking IS NOT NULL OR
        score_display IS NOT NULL OR
        score_presentation IS NOT NULL OR
        score_taste IS NOT NULL OR
        score_staff_training IS NOT NULL OR
        score_baking_params IS NOT NULL
      )
  ) scores;

  -- Update the visit with calculated average
  UPDATE visitas.store_visits
  SET average_score = avg_score, updated_at = NOW()
  WHERE id = p_visit_id;

  RETURN COALESCE(avg_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update average score when product evaluations change
CREATE OR REPLACE FUNCTION visitas.update_visit_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM visitas.calculate_visit_average_score(
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.visit_id
      ELSE NEW.visit_id
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_evaluation_score_update
  AFTER INSERT OR UPDATE OR DELETE ON visitas.product_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION visitas.update_visit_score_trigger();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION visitas.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER store_visits_updated_at
  BEFORE UPDATE ON visitas.store_visits
  FOR EACH ROW
  EXECUTE FUNCTION visitas.update_updated_at_column();

CREATE TRIGGER product_evaluations_updated_at
  BEFORE UPDATE ON visitas.product_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION visitas.update_updated_at_column();
