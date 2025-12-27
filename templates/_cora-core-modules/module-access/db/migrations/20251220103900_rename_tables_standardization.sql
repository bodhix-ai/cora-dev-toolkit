-- =============================================================================
-- Migration: Table Naming Standardization
-- =============================================================================
-- Date: December 20, 2025
-- Purpose: Rename tables to follow consistent user_* naming convention
-- Changes:
--   - profiles → user_profiles
--   - external_identities → user_auth_ext_ids
--   - auth_event_log → user_auth_log
--   - user_sessions (no change, already follows convention)
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- =============================================================================

-- =============================================================================
-- STEP 1: Rename Tables
-- =============================================================================

-- Rename profiles → user_profiles (if not already renamed)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'user_profiles'
    ) THEN
        ALTER TABLE public.profiles RENAME TO user_profiles;
        RAISE NOTICE 'Renamed table: profiles → user_profiles';
    ELSE
        RAISE NOTICE 'Table user_profiles already exists or profiles does not exist';
    END IF;
END $$;

-- Rename external_identities → user_auth_ext_ids (if not already renamed)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'external_identities'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'user_auth_ext_ids'
    ) THEN
        ALTER TABLE public.external_identities RENAME TO user_auth_ext_ids;
        RAISE NOTICE 'Renamed table: external_identities → user_auth_ext_ids';
    ELSE
        RAISE NOTICE 'Table user_auth_ext_ids already exists or external_identities does not exist';
    END IF;
END $$;

-- Rename auth_event_log → user_auth_log (if not already renamed)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'auth_event_log'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'user_auth_log'
    ) THEN
        ALTER TABLE public.auth_event_log RENAME TO user_auth_log;
        RAISE NOTICE 'Renamed table: auth_event_log → user_auth_log';
    ELSE
        RAISE NOTICE 'Table user_auth_log already exists or auth_event_log does not exist';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Rename Indexes
-- =============================================================================

-- Rename profiles indexes
DO $$
BEGIN
    -- Only rename if old index exists and new one doesn't
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_user_id') THEN
        ALTER INDEX IF EXISTS public.idx_profiles_user_id RENAME TO idx_user_profiles_user_id;
        RAISE NOTICE 'Renamed index: idx_profiles_user_id → idx_user_profiles_user_id';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_email') THEN
        ALTER INDEX IF EXISTS public.idx_profiles_email RENAME TO idx_user_profiles_email;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_global_role') THEN
        ALTER INDEX IF EXISTS public.idx_profiles_global_role RENAME TO idx_user_profiles_global_role;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_current_org_id') THEN
        ALTER INDEX IF EXISTS public.idx_profiles_current_org_id RENAME TO idx_user_profiles_current_org_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_requires_invitation') THEN
        ALTER INDEX IF EXISTS public.idx_profiles_requires_invitation RENAME TO idx_user_profiles_requires_invitation;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_created_by') THEN
        ALTER INDEX IF EXISTS public.idx_profiles_created_by RENAME TO idx_user_profiles_created_by;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_updated_by') THEN
        ALTER INDEX IF EXISTS public.idx_profiles_updated_by RENAME TO idx_user_profiles_updated_by;
    END IF;
END $$;

-- Rename external_identities indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_external_identities_auth_user_id') THEN
        ALTER INDEX IF EXISTS public.idx_external_identities_auth_user_id RENAME TO idx_user_auth_ext_ids_auth_user_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_external_identities_provider') THEN
        ALTER INDEX IF EXISTS public.idx_external_identities_provider RENAME TO idx_user_auth_ext_ids_provider;
    END IF;
END $$;

-- Rename auth_event_log indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_auth_event_user_id') THEN
        ALTER INDEX IF EXISTS public.idx_auth_event_user_id RENAME TO idx_user_auth_log_user_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_auth_event_email') THEN
        ALTER INDEX IF EXISTS public.idx_auth_event_email RENAME TO idx_user_auth_log_email;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_auth_event_type') THEN
        ALTER INDEX IF EXISTS public.idx_auth_event_type RENAME TO idx_user_auth_log_type;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_auth_event_occurred_at') THEN
        ALTER INDEX IF EXISTS public.idx_auth_event_occurred_at RENAME TO idx_user_auth_log_occurred_at;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_auth_event_org_id') THEN
        ALTER INDEX IF EXISTS public.idx_auth_event_org_id RENAME TO idx_user_auth_log_org_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_auth_event_failures') THEN
        ALTER INDEX IF EXISTS public.idx_auth_event_failures RENAME TO idx_user_auth_log_failures;
    END IF;
END $$;

-- =============================================================================
-- STEP 3: Rename Constraints
-- =============================================================================

-- Rename profiles constraints
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_current_org_id_fkey') THEN
        ALTER TABLE IF EXISTS public.user_profiles RENAME CONSTRAINT profiles_current_org_id_fkey TO user_profiles_current_org_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_created_by_fkey') THEN
        ALTER TABLE IF EXISTS public.user_profiles RENAME CONSTRAINT profiles_created_by_fkey TO user_profiles_created_by_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_updated_by_fkey') THEN
        ALTER TABLE IF EXISTS public.user_profiles RENAME CONSTRAINT profiles_updated_by_fkey TO user_profiles_updated_by_fkey;
    END IF;
END $$;

-- =============================================================================
-- STEP 4: Create New Functions (must come before creating triggers)
-- =============================================================================

-- Create new user_profiles function
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new user_auth_ext_ids function
CREATE OR REPLACE FUNCTION update_user_auth_ext_ids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 5: Rename Triggers (uses functions created in STEP 4)
-- =============================================================================

-- Rename profiles trigger
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE t.tgname = 'profiles_updated_at' AND c.relname = 'user_profiles'
    ) THEN
        DROP TRIGGER IF EXISTS profiles_updated_at ON public.user_profiles;
        CREATE TRIGGER user_profiles_updated_at
            BEFORE UPDATE ON public.user_profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_user_profiles_updated_at();
        RAISE NOTICE 'Recreated trigger: user_profiles_updated_at';
    END IF;
END $$;

-- Rename external_identities trigger
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE t.tgname = 'external_identities_updated_at' AND c.relname = 'user_auth_ext_ids'
    ) THEN
        DROP TRIGGER IF EXISTS external_identities_updated_at ON public.user_auth_ext_ids;
        CREATE TRIGGER user_auth_ext_ids_updated_at
            BEFORE UPDATE ON public.user_auth_ext_ids
            FOR EACH ROW
            EXECUTE FUNCTION update_user_auth_ext_ids_updated_at();
        RAISE NOTICE 'Recreated trigger: user_auth_ext_ids_updated_at';
    END IF;
END $$;

-- =============================================================================
-- STEP 6: Drop Old Functions (safe now that old triggers are gone)
-- =============================================================================

-- Drop old functions (safe now that triggers have been recreated)
DROP FUNCTION IF EXISTS update_profiles_updated_at();
DROP FUNCTION IF EXISTS update_external_identities_updated_at();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_user_profiles_exists BOOLEAN;
    v_user_auth_ext_ids_exists BOOLEAN;
    v_user_auth_log_exists BOOLEAN;
BEGIN
    -- Check if new tables exist
    v_user_profiles_exists := EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles'
    );
    
    v_user_auth_ext_ids_exists := EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_auth_ext_ids'
    );
    
    v_user_auth_log_exists := EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_auth_log'
    );
    
    -- Report results
    RAISE NOTICE '=== Migration Verification ===';
    RAISE NOTICE 'user_profiles table exists: %', v_user_profiles_exists;
    RAISE NOTICE 'user_auth_ext_ids table exists: %', v_user_auth_ext_ids_exists;
    RAISE NOTICE 'user_auth_log table exists: %', v_user_auth_log_exists;
    
    IF v_user_profiles_exists AND v_user_auth_ext_ids_exists AND v_user_auth_log_exists THEN
        RAISE NOTICE '✅ Migration completed successfully!';
    ELSE
        RAISE WARNING '⚠️  Some tables were not renamed. Check logs above.';
    END IF;
END $$;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =============================================================================
/*
To rollback this migration (NOT RECOMMENDED after Lambda code is updated):

-- Rename tables back
ALTER TABLE public.user_profiles RENAME TO profiles;
ALTER TABLE public.user_auth_ext_ids RENAME TO external_identities;
ALTER TABLE public.user_auth_log RENAME TO auth_event_log;

-- Rename indexes back (see STEP 2 above, reverse the renames)
-- Rename constraints back (see STEP 3 above, reverse the renames)
-- Recreate triggers with old names
-- Recreate functions with old names
*/
