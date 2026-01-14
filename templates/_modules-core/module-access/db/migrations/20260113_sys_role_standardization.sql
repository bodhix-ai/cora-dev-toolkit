-- =============================================================================
-- Migration: System Role Standardization
-- =============================================================================
-- Date: January 13, 2026
-- Purpose: Standardize all role naming to use sys_ prefix
-- Changes:
--   TABLES:
--   - platform_lambda_config → sys_lambda_config
--   - platform_module_registry → sys_module_registry
--   - platform_module_usage → sys_module_usage
--   - platform_module_usage_daily → sys_module_usage_daily
--   - platform_rag → sys_rag
--   - platform_idp_config → sys_idp_config
--   - platform_idp_audit_log → sys_idp_audit_log
--
--   COLUMNS:
--   - user_profiles.global_role → user_profiles.sys_role
--   - org_members.role → org_members.org_role
--
--   VALUES:
--   - platform_owner → sys_owner
--   - platform_admin → sys_admin
--   - platform_user → sys_user
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: TABLE RENAMES (platform_* → sys_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Module-MGMT Tables
-- -----------------------------------------------------------------------------

-- Table 1: platform_lambda_config → sys_lambda_config
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'platform_lambda_config'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'sys_lambda_config'
    ) THEN
        ALTER TABLE public.platform_lambda_config RENAME TO sys_lambda_config;
        RAISE NOTICE 'Renamed table: platform_lambda_config → sys_lambda_config';
    ELSE
        RAISE NOTICE 'Table sys_lambda_config already exists or platform_lambda_config does not exist';
    END IF;
END $$;

-- Table 2: platform_module_registry → sys_module_registry
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'platform_module_registry'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'sys_module_registry'
    ) THEN
        ALTER TABLE public.platform_module_registry RENAME TO sys_module_registry;
        RAISE NOTICE 'Renamed table: platform_module_registry → sys_module_registry';
    ELSE
        RAISE NOTICE 'Table sys_module_registry already exists or platform_module_registry does not exist';
    END IF;
END $$;

-- Table 3: platform_module_usage → sys_module_usage
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'platform_module_usage'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'sys_module_usage'
    ) THEN
        ALTER TABLE public.platform_module_usage RENAME TO sys_module_usage;
        RAISE NOTICE 'Renamed table: platform_module_usage → sys_module_usage';
    ELSE
        RAISE NOTICE 'Table sys_module_usage already exists or platform_module_usage does not exist';
    END IF;
END $$;

-- Table 4: platform_module_usage_daily → sys_module_usage_daily
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'platform_module_usage_daily'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'sys_module_usage_daily'
    ) THEN
        ALTER TABLE public.platform_module_usage_daily RENAME TO sys_module_usage_daily;
        RAISE NOTICE 'Renamed table: platform_module_usage_daily → sys_module_usage_daily';
    ELSE
        RAISE NOTICE 'Table sys_module_usage_daily already exists or platform_module_usage_daily does not exist';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Module-AI Tables
-- -----------------------------------------------------------------------------

-- Table 5: platform_rag → sys_rag
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'platform_rag'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'sys_rag'
    ) THEN
        ALTER TABLE public.platform_rag RENAME TO sys_rag;
        RAISE NOTICE 'Renamed table: platform_rag → sys_rag';
    ELSE
        RAISE NOTICE 'Table sys_rag already exists or platform_rag does not exist';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Module-Access Tables
-- -----------------------------------------------------------------------------

-- Table 6: platform_idp_config → sys_idp_config
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'platform_idp_config'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'sys_idp_config'
    ) THEN
        ALTER TABLE public.platform_idp_config RENAME TO sys_idp_config;
        RAISE NOTICE 'Renamed table: platform_idp_config → sys_idp_config';
    ELSE
        RAISE NOTICE 'Table sys_idp_config already exists or platform_idp_config does not exist';
    END IF;
END $$;

-- Table 7: platform_idp_audit_log → sys_idp_audit_log
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'platform_idp_audit_log'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'sys_idp_audit_log'
    ) THEN
        ALTER TABLE public.platform_idp_audit_log RENAME TO sys_idp_audit_log;
        RAISE NOTICE 'Renamed table: platform_idp_audit_log → sys_idp_audit_log';
    ELSE
        RAISE NOTICE 'Table sys_idp_audit_log already exists or platform_idp_audit_log does not exist';
    END IF;
END $$;

-- =============================================================================
-- PART 2: INDEX RENAMES
-- =============================================================================

-- Module-MGMT indexes
DO $$
BEGIN
    -- platform_lambda_config indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_lambda_config_key') THEN
        ALTER INDEX idx_platform_lambda_config_key RENAME TO idx_sys_lambda_config_key;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_lambda_config_active') THEN
        ALTER INDEX idx_platform_lambda_config_active RENAME TO idx_sys_lambda_config_active;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_lambda_config_updated') THEN
        ALTER INDEX idx_platform_lambda_config_updated RENAME TO idx_sys_lambda_config_updated;
    END IF;
    
    -- platform_module_registry indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_module_registry_name') THEN
        ALTER INDEX idx_platform_module_registry_name RENAME TO idx_sys_module_registry_name;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_module_registry_enabled') THEN
        ALTER INDEX idx_platform_module_registry_enabled RENAME TO idx_sys_module_registry_enabled;
    END IF;
    
    -- platform_module_usage indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_module_usage_module') THEN
        ALTER INDEX idx_platform_module_usage_module RENAME TO idx_sys_module_usage_module;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_module_usage_org') THEN
        ALTER INDEX idx_platform_module_usage_org RENAME TO idx_sys_module_usage_org;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_module_usage_timestamp') THEN
        ALTER INDEX idx_platform_module_usage_timestamp RENAME TO idx_sys_module_usage_timestamp;
    END IF;
    
    -- platform_module_usage_daily indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_module_usage_daily_date') THEN
        ALTER INDEX idx_platform_module_usage_daily_date RENAME TO idx_sys_module_usage_daily_date;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_module_usage_daily_module') THEN
        ALTER INDEX idx_platform_module_usage_daily_module RENAME TO idx_sys_module_usage_daily_module;
    END IF;
    
    RAISE NOTICE 'Renamed module-mgmt indexes';
END $$;

-- Module-Access indexes
DO $$
BEGIN
    -- platform_idp_config indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_single_active_idp') THEN
        -- This index doesn't need renaming (doesn't have platform_ prefix)
        RAISE NOTICE 'idx_single_active_idp: no rename needed';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idp_provider_type') THEN
        -- This index doesn't need renaming (doesn't have platform_ prefix)
        RAISE NOTICE 'idx_idp_provider_type: no rename needed';
    END IF;
    
    -- platform_idp_audit_log indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idp_audit_config') THEN
        -- This index doesn't need renaming (doesn't have platform_ prefix)
        RAISE NOTICE 'idx_idp_audit_config: no rename needed';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_idp_audit_performed_at') THEN
        -- This index doesn't need renaming (doesn't have platform_ prefix)
        RAISE NOTICE 'idx_idp_audit_performed_at: no rename needed';
    END IF;
    
    RAISE NOTICE 'Checked module-access indexes';
END $$;

-- =============================================================================
-- PART 3: TRIGGER AND FUNCTION RENAMES
-- =============================================================================

-- Rename platform_lambda_config trigger and function
DO $$
BEGIN
    -- Drop old trigger if exists
    DROP TRIGGER IF EXISTS platform_lambda_config_updated_at ON public.sys_lambda_config;
    
    -- Create renamed function
    CREATE OR REPLACE FUNCTION update_sys_lambda_config_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    
    -- Create trigger with new name (if table exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sys_lambda_config') THEN
        DROP TRIGGER IF EXISTS sys_lambda_config_updated_at ON public.sys_lambda_config;
        CREATE TRIGGER sys_lambda_config_updated_at 
            BEFORE UPDATE ON public.sys_lambda_config
            FOR EACH ROW
            EXECUTE FUNCTION update_sys_lambda_config_updated_at();
    END IF;
    
    -- Drop old function
    DROP FUNCTION IF EXISTS update_platform_lambda_config_updated_at();
    
    RAISE NOTICE 'Renamed sys_lambda_config trigger and function';
END $$;

-- Update IDP triggers to reference sys_idp_config
DO $$
BEGIN
    -- Update ensure_single_active_idp function to reference new table name
    CREATE OR REPLACE FUNCTION ensure_single_active_idp()
    RETURNS TRIGGER AS $func$
    BEGIN
        -- If activating this IDP, deactivate all others
        IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
            UPDATE sys_idp_config 
            SET is_active = false, updated_at = NOW()
            WHERE id != NEW.id AND is_active = true;
        END IF;
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    
    -- Update get_active_idp_config function
    CREATE OR REPLACE FUNCTION get_active_idp_config()
    RETURNS TABLE (
        provider_type VARCHAR(50),
        config JSONB,
        display_name VARCHAR(255)
    ) AS $func$
    BEGIN
        RETURN QUERY
        SELECT 
            p.provider_type,
            p.config,
            p.display_name
        FROM sys_idp_config p
        WHERE p.is_active = true
        LIMIT 1;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
    
    RAISE NOTICE 'Updated IDP functions to reference sys_idp_config';
END $$;

-- =============================================================================
-- PART 4: COLUMN RENAMES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rename user_profiles.global_role → user_profiles.sys_role
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    -- Check if old column exists and new doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'global_role'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'sys_role'
    ) THEN
        -- Step 1: Add new column with default
        ALTER TABLE public.user_profiles 
        ADD COLUMN sys_role VARCHAR(50) NOT NULL DEFAULT 'sys_user';
        
        -- Step 2: Copy data from old column, converting values
        UPDATE public.user_profiles 
        SET sys_role = CASE 
            WHEN global_role = 'platform_owner' THEN 'sys_owner'
            WHEN global_role = 'platform_admin' THEN 'sys_admin'
            WHEN global_role = 'platform_user' THEN 'sys_user'
            ELSE 'sys_user'
        END;
        
        -- Step 3: Add constraint
        ALTER TABLE public.user_profiles
        ADD CONSTRAINT user_profiles_sys_role_check 
        CHECK (sys_role IN ('sys_owner', 'sys_admin', 'sys_user'));
        
        -- Step 4: Drop old constraint
        ALTER TABLE public.user_profiles
        DROP CONSTRAINT IF EXISTS user_profiles_global_role_check;
        
        -- Step 5: Drop old column
        ALTER TABLE public.user_profiles
        DROP COLUMN global_role;
        
        -- Step 6: Add comment
        COMMENT ON COLUMN public.user_profiles.sys_role IS 
        'System-level role. Values: sys_owner (full access), sys_admin (admin), sys_user (regular user)';
        
        RAISE NOTICE 'Renamed column: user_profiles.global_role → user_profiles.sys_role';
    ELSE
        RAISE NOTICE 'Column sys_role already exists or global_role does not exist';
    END IF;
END $$;

-- Update index if it exists (global_role → sys_role)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_profiles_global_role') THEN
        ALTER INDEX idx_user_profiles_global_role RENAME TO idx_user_profiles_sys_role;
        RAISE NOTICE 'Renamed index: idx_user_profiles_global_role → idx_user_profiles_sys_role';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Rename org_members.role → org_members.org_role
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    -- Check if old column exists and new doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'org_members' 
        AND column_name = 'role'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'org_members' 
        AND column_name = 'org_role'
    ) THEN
        -- Step 1: Add new column
        ALTER TABLE public.org_members
        ADD COLUMN org_role VARCHAR(50) NOT NULL DEFAULT 'org_user';
        
        -- Step 2: Copy data from old column
        UPDATE public.org_members
        SET org_role = role;
        
        -- Step 3: Add constraint
        ALTER TABLE public.org_members
        ADD CONSTRAINT org_members_org_role_check
        CHECK (org_role IN ('org_owner', 'org_admin', 'org_user'));
        
        -- Step 4: Drop old constraint
        ALTER TABLE public.org_members
        DROP CONSTRAINT IF EXISTS org_members_role_check;
        
        -- Step 5: Drop old column
        ALTER TABLE public.org_members
        DROP COLUMN role;
        
        -- Step 6: Add comment
        COMMENT ON COLUMN public.org_members.org_role IS
        'Organization-level role. Values: org_owner, org_admin, org_user';
        
        RAISE NOTICE 'Renamed column: org_members.role → org_members.org_role';
    ELSE
        RAISE NOTICE 'Column org_role already exists or role does not exist';
    END IF;
END $$;

-- Update index if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_members_role') THEN
        ALTER INDEX idx_org_members_role RENAME TO idx_org_members_org_role;
        RAISE NOTICE 'Renamed index: idx_org_members_role → idx_org_members_org_role';
    END IF;
END $$;

-- =============================================================================
-- PART 5: VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_table_count INTEGER;
    v_old_table_count INTEGER;
    v_sys_role_exists BOOLEAN;
    v_org_role_exists BOOLEAN;
    v_global_role_exists BOOLEAN;
    v_role_exists BOOLEAN;
BEGIN
    -- Count new sys_* tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'sys_lambda_config',
        'sys_module_registry',
        'sys_module_usage',
        'sys_module_usage_daily',
        'sys_rag',
        'sys_idp_config',
        'sys_idp_audit_log'
    );
    
    -- Count old platform_* tables (should be 0)
    SELECT COUNT(*) INTO v_old_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE 'platform_%';
    
    -- Check column renames
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'sys_role'
    ) INTO v_sys_role_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'org_members' 
        AND column_name = 'org_role'
    ) INTO v_org_role_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'global_role'
    ) INTO v_global_role_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'org_members' 
        AND column_name = 'role'
    ) INTO v_role_exists;
    
    RAISE NOTICE '=== Migration Verification ===';
    RAISE NOTICE 'sys_* tables found: % (expected: 7)', v_table_count;
    RAISE NOTICE 'platform_* tables remaining: % (expected: 0)', v_old_table_count;
    RAISE NOTICE 'user_profiles.sys_role exists: %', v_sys_role_exists;
    RAISE NOTICE 'org_members.org_role exists: %', v_org_role_exists;
    RAISE NOTICE 'user_profiles.global_role exists (should be false): %', v_global_role_exists;
    RAISE NOTICE 'org_members.role exists (should be false): %', v_role_exists;
    
    -- Show role distribution
    IF v_sys_role_exists THEN
        RAISE NOTICE '--- Role Distribution ---';
        RAISE NOTICE 'sys_owner: %', (SELECT COUNT(*) FROM user_profiles WHERE sys_role = 'sys_owner');
        RAISE NOTICE 'sys_admin: %', (SELECT COUNT(*) FROM user_profiles WHERE sys_role = 'sys_admin');
        RAISE NOTICE 'sys_user: %', (SELECT COUNT(*) FROM user_profiles WHERE sys_role = 'sys_user');
    END IF;
    
    IF v_old_table_count = 0 AND v_sys_role_exists AND v_org_role_exists 
       AND NOT v_global_role_exists AND NOT v_role_exists THEN
        RAISE NOTICE '✅ Migration completed successfully!';
    ELSE
        RAISE WARNING '⚠️  Migration may be incomplete. Check logs above.';
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =============================================================================
/*
To rollback this migration (NOT RECOMMENDED after code is updated):

-- Rollback table renames
ALTER TABLE public.sys_lambda_config RENAME TO platform_lambda_config;
ALTER TABLE public.sys_module_registry RENAME TO platform_module_registry;
ALTER TABLE public.sys_module_usage RENAME TO platform_module_usage;
ALTER TABLE public.sys_module_usage_daily RENAME TO platform_module_usage_daily;
ALTER TABLE public.sys_rag RENAME TO platform_rag;
ALTER TABLE public.sys_idp_config RENAME TO platform_idp_config;
ALTER TABLE public.sys_idp_audit_log RENAME TO platform_idp_audit_log;

-- Rollback column renames
ALTER TABLE public.user_profiles ADD COLUMN global_role VARCHAR(50);
UPDATE public.user_profiles SET global_role = 
  CASE 
    WHEN sys_role = 'sys_owner' THEN 'platform_owner'
    WHEN sys_role = 'sys_admin' THEN 'platform_admin'
    WHEN sys_role = 'sys_user' THEN 'platform_user'
  END;
ALTER TABLE public.user_profiles DROP COLUMN sys_role;

ALTER TABLE public.org_members ADD COLUMN role VARCHAR(50);
UPDATE public.org_members SET role = org_role;
ALTER TABLE public.org_members DROP COLUMN org_role;
*/
