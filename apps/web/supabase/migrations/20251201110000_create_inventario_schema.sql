-- =====================================================
-- Migration: Create Inventario Schema
-- =====================================================
-- Purpose: Create dedicated schema for inventory management
-- Author: System Architecture
-- Date: 2025-12-01
-- =====================================================

-- 1. Create schema
CREATE SCHEMA IF NOT EXISTS inventario;

-- 2. Grant usage on schema
GRANT USAGE ON SCHEMA inventario TO anon, authenticated, service_role;

-- 3. Grant permissions on all existing objects
GRANT ALL ON ALL TABLES IN SCHEMA inventario TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA inventario TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA inventario TO anon, authenticated, service_role;

-- 4. Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA inventario
GRANT ALL ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA inventario
GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA inventario
GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 5. Add inventario to search_path (optional, but recommended)
-- This allows queries without schema prefix
ALTER DATABASE postgres SET search_path = public, inventario, produccion;

-- 6. Add comment
COMMENT ON SCHEMA inventario IS 'Professional WMS-level inventory management system with hierarchical locations, unified movements, and automatic balance tracking';
