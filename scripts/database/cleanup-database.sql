-- ============================================================================
-- Database Cleanup Script
-- ============================================================================
-- Purpose: Complete cleanup of all user-created database objects in public schema
-- Use Case: Preparing database for fresh CORA project deployment
-- WARNING: This will PERMANENTLY DELETE all data and database objects!
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
    drop_count INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Starting database cleanup...';
    RAISE NOTICE '============================================================';
    
    -- Drop all views first (they may depend on tables)
    RAISE NOTICE 'Dropping views...';
    FOR r IN (
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
        drop_count := drop_count + 1;
        RAISE NOTICE '  ✓ Dropped view: %', r.viewname;
    END LOOP;
    
    -- Drop all materialized views
    RAISE NOTICE 'Dropping materialized views...';
    FOR r IN (
        SELECT matviewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.' || quote_ident(r.matviewname) || ' CASCADE';
        drop_count := drop_count + 1;
        RAISE NOTICE '  ✓ Dropped materialized view: %', r.matviewname;
    END LOOP;
    
    -- Drop all tables (CASCADE will drop indexes, constraints, triggers, and RLS policies)
    RAISE NOTICE 'Dropping tables (with indexes, triggers, constraints, RLS)...';
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        drop_count := drop_count + 1;
        RAISE NOTICE '  ✓ Dropped table: %', r.tablename;
    END LOOP;
    
    -- Drop all sequences
    RAISE NOTICE 'Dropping sequences...';
    FOR r IN (
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    ) LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
        drop_count := drop_count + 1;
        RAISE NOTICE '  ✓ Dropped sequence: %', r.sequence_name;
    END LOOP;
    
    -- Drop all functions (excluding extension-owned functions)
    RAISE NOTICE 'Dropping functions...';
    FOR r IN (
        SELECT p.proname as name,
               pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
        WHERE n.nspname = 'public'
        AND d.objid IS NULL  -- Exclude functions that are dependencies of extensions
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.name) || '(' || r.args || ') CASCADE';
        drop_count := drop_count + 1;
        RAISE NOTICE '  ✓ Dropped function: %(%)', r.name, r.args;
    END LOOP;
    
    -- Drop all custom enum types
    RAISE NOTICE 'Dropping custom types...';
    FOR r IN (
        SELECT t.typname
        FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.typtype = 'e'  -- enum types
    ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        drop_count := drop_count + 1;
        RAISE NOTICE '  ✓ Dropped type: %', r.typname;
    END LOOP;
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Database cleanup complete! Dropped % objects.', drop_count;
    RAISE NOTICE '============================================================';
END $$;
