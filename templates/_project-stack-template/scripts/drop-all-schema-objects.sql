-- =============================================
-- DROP ALL SCHEMA OBJECTS
-- =============================================
-- Purpose: Clean the database by dropping all custom schema objects
-- Usage: Run this before re-running setup-database.sql on existing DB
-- WARNING: This will destroy all data! Use with caution.
--
-- How to use:
--   psql "$DATABASE_URL" -f scripts/drop-all-schema-objects.sql
--
-- After running this, you can run setup-database.sql to recreate everything:
--   psql "$DATABASE_URL" -f scripts/setup-database.sql

-- =============================================
-- DELETE ALL AUTH USERS (Supabase auth schema)
-- =============================================
-- CRITICAL: Delete auth.users FIRST to prevent orphaned users
-- This must happen before dropping public tables to avoid foreign key issues

DELETE FROM auth.users;

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Deleted all users from auth.users';
    RAISE NOTICE 'This prevents orphaned users when public tables are reset';
    RAISE NOTICE '============================================';
END $$;

-- =============================================
-- DISABLE ROW LEVEL SECURITY (temporarily)
-- =============================================
-- This allows us to drop policies and tables without RLS blocking us

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Disable RLS on all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

-- =============================================
-- DROP ALL POLICIES
-- =============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- =============================================
-- DROP ALL TRIGGERS
-- =============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_schema, trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.' || quote_ident(r.event_object_table);
    END LOOP;
END $$;

-- =============================================
-- DROP ALL TABLES (CASCADE to handle FKs)
-- =============================================

DROP TABLE IF EXISTS public.platform_module_usage_daily CASCADE;
DROP TABLE IF EXISTS public.platform_module_usage CASCADE;
DROP TABLE IF EXISTS public.platform_module_registry CASCADE;
DROP TABLE IF EXISTS public.platform_lambda_config CASCADE;
DROP TABLE IF EXISTS public.org_prompt_engineering CASCADE;
DROP TABLE IF EXISTS public.platform_rag CASCADE;
DROP TABLE IF EXISTS public.ai_model_validation_progress CASCADE;
DROP TABLE IF EXISTS public.ai_model_validation_history CASCADE;
DROP TABLE IF EXISTS public.ai_models CASCADE;
DROP TABLE IF EXISTS public.ai_providers CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.user_auth_log CASCADE;
DROP TABLE IF EXISTS public.user_invites CASCADE;
DROP TABLE IF EXISTS public.org_email_domains CASCADE;
DROP TABLE IF EXISTS public.platform_idp_audit_log CASCADE;
DROP TABLE IF EXISTS public.platform_idp_config CASCADE;
DROP TABLE IF EXISTS public.org_members CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.orgs CASCADE;
DROP TABLE IF EXISTS public.user_auth_ext_ids CASCADE;

-- =============================================
-- DROP ALL FUNCTIONS
-- =============================================

DROP FUNCTION IF EXISTS update_platform_rag_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_org_prompt_engineering_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_user_sessions_activity() CASCADE;
DROP FUNCTION IF EXISTS ensure_single_active_idp() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;

-- Note: Add more DROP FUNCTION statements as needed for any custom functions

-- =============================================
-- DROP ALL SEQUENCES
-- =============================================

-- Most sequences are auto-created by tables, so they're dropped with CASCADE
-- But if you have standalone sequences, drop them here:
-- DROP SEQUENCE IF EXISTS public.some_custom_sequence CASCADE;

-- =============================================
-- DROP ALL CUSTOM TYPES/ENUMS
-- =============================================

-- If you have custom enum types, drop them here:
-- DROP TYPE IF EXISTS public.some_enum_type CASCADE;

-- =============================================
-- SUMMARY
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'All schema objects have been dropped!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run: psql "$DATABASE_URL" -f scripts/setup-database.sql';
    RAISE NOTICE '2. This will recreate all tables, functions, triggers, and policies';
    RAISE NOTICE '============================================';
END $$;
