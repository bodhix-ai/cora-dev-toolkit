-- =============================================================================
-- CORA Schema Introspection RPC Functions
-- =============================================================================
-- Purpose: Provide schema introspection capabilities via Supabase REST API
-- Required for: schema-validator when direct PostgreSQL connection is not available
-- 
-- These functions are deployed as part of module-mgmt (Tier 3) but should be
-- installed early in the setup process to enable validation.
--
-- Created: December 2025
-- =============================================================================

-- -----------------------------------------------------------------------------
-- get_schema_info()
-- -----------------------------------------------------------------------------
-- Returns column information for all tables in the public schema.
-- Used by schema-validator to validate Lambda queries against actual schema.
--
-- Returns:
--   table_name    - Name of the table
--   column_name   - Name of the column
--   data_type     - PostgreSQL data type
--   is_nullable   - 'YES' or 'NO'
--   column_default - Default value expression (if any)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_schema_info()
RETURNS TABLE(
    table_name text,
    column_name text,
    data_type text,
    is_nullable text,
    column_default text
) AS $$
    SELECT 
        c.table_name::text,
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION get_schema_info() IS 
'Returns schema information for all public tables. Used by CORA schema-validator.';


-- -----------------------------------------------------------------------------
-- get_all_tables()
-- -----------------------------------------------------------------------------
-- Returns a list of all table names in the public schema.
-- Used for dynamic table discovery when PostgREST OpenAPI endpoint is unavailable.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_all_tables()
RETURNS TABLE(table_name text) AS $$
    SELECT tablename::text 
    FROM pg_tables 
    WHERE schemaname = 'public';
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION get_all_tables() IS 
'Returns list of all public tables. Used by CORA schema-validator for table discovery.';


-- -----------------------------------------------------------------------------
-- get_table_columns(target_table text)
-- -----------------------------------------------------------------------------
-- Returns column information for a specific table.
-- Useful for targeted schema inspection.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_table_columns(target_table text)
RETURNS TABLE(
    column_name text,
    data_type text,
    is_nullable text,
    column_default text
) AS $$
    SELECT 
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = target_table
    ORDER BY c.ordinal_position;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION get_table_columns(text) IS 
'Returns column information for a specific table. Used by CORA schema-validator.';
