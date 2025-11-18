-- Add Updated Timestamp Trigger for Material Receptions
-- Automatically updates updated_at when a row is modified

-- =====================================================
-- FUNCTION: Update timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION compras.update_material_receptions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Update timestamp on update
-- =====================================================
DROP TRIGGER IF EXISTS update_material_receptions_timestamp ON compras.material_receptions;

CREATE TRIGGER update_material_receptions_timestamp
BEFORE UPDATE ON compras.material_receptions
FOR EACH ROW
EXECUTE FUNCTION compras.update_material_receptions_timestamp();

-- =====================================================
-- FUNCTION: Update timestamp for reception items
-- =====================================================
CREATE OR REPLACE FUNCTION compras.update_reception_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Update timestamp on update for reception items
-- =====================================================
DROP TRIGGER IF EXISTS update_reception_items_timestamp ON compras.reception_items;

CREATE TRIGGER update_reception_items_timestamp
BEFORE UPDATE ON compras.reception_items
FOR EACH ROW
EXECUTE FUNCTION compras.update_reception_items_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION compras.update_material_receptions_timestamp() IS 'Automatically updates the updated_at timestamp when material_receptions is modified';
COMMENT ON FUNCTION compras.update_reception_items_timestamp() IS 'Automatically updates the updated_at timestamp when reception_items is modified';
