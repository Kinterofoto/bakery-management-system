-- Add delivery days field to suppliers table
-- This allows suppliers to specify which days they deliver

ALTER TABLE compras.suppliers
ADD COLUMN delivery_days JSONB DEFAULT '{"monday": false, "tuesday": false, "wednesday": false, "thursday": false, "friday": false, "saturday": false, "sunday": false}'::jsonb;

COMMENT ON COLUMN compras.suppliers.delivery_days IS 'Days of the week when the supplier delivers. JSON object with day names as keys and boolean values';
