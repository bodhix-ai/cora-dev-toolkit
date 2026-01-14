-- =============================================================================
-- Migration: Rename global_role to sys_role in user_profiles
-- =============================================================================
-- Date: January 13, 2026
-- Purpose: Rename global_role column to sys_role and update values
-- Changes:
--   - Column: global_role → sys_role
--   - Values: platform_owner → sys_owner, platform_admin → sys_admin, platform_user → sys_user
--   - Index: idx_user_profiles_global_role → idx_user_profiles_sys_role
--
-- This migration is IDEMPOTENT - safe to run multiple times
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Add new column and migrate data
-- =============================================================================

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
        
        RAISE NOTICE 'Added sys_role column with default sys_user';
        
        -- Step 2: Copy data from old column, converting values
        UPDATE public.user_profiles 
        SET sys_role = CASE 
            WHEN global_role = 'platform_owner' THEN 'sys_owner'
            WHEN global_role = 'platform_admin' THEN 'sys_admin'
            WHEN global_role = 'platform_user' THEN 'sys_user'
            WHEN global_role IS NULL THEN 'sys_user'
            ELSE 'sys_user'
        END;
        
        RAISE NOTICE 'Migrated global_role values to sys_role';
        
        -- Step 3: Add constraint
        ALTER TABLE public.user_profiles
        ADD CONSTRAINT user_profiles_sys_role_check 
        CHECK (sys_role IN ('sys_owner', 'sys_admin', 'sys_user'));
        
        RAISE NOTICE 'Added sys_role constraint';
        
        -- Step 4: Drop old constraint (if exists)
        ALTER TABLE public.user_profiles
        DROP CONSTRAINT IF EXISTS user_profiles_global_role_check;
        
        -- Step 5: Drop old column
        ALTER TABLE public.user_profiles
        DROP COLUMN global_role;
        
        RAISE NOTICE 'Dropped global_role column';
        
        -- Step 6: Add comment
        COMMENT ON COLUMN public.user_profiles.sys_role IS 
        'System-level role. Values: sys_owner (full access), sys_admin (admin), sys_user (regular user - default)';
        
        RAISE NOTICE 'Column migration complete: global_role → sys_role';
    ELSE
        RAISE NOTICE 'Column sys_role already exists or global_role does not exist - skipping migration';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Update index (if exists)
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_profiles_global_role') THEN
        ALTER INDEX idx_user_profiles_global_role RENAME TO idx_user_profiles_sys_role;
        RAISE NOTICE 'Renamed index: idx_user_profiles_global_role → idx_user_profiles_sys_role';
    ELSIF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_profiles_sys_role') THEN
        -- Create index if neither old nor new exists
        CREATE INDEX idx_user_profiles_sys_role ON public.user_profiles(sys_role);
        RAISE NOTICE 'Created new index: idx_user_profiles_sys_role';
    ELSE
        RAISE NOTICE 'Index idx_user_profiles_sys_role already exists - skipping';
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_sys_role_exists BOOLEAN;
    v_global_role_exists BOOLEAN;
    v_constraint_exists BOOLEAN;
    v_total_users INTEGER;
    v_sys_owners INTEGER;
    v_sys_admins INTEGER;
    v_sys_users INTEGER;
BEGIN
    -- Check column existence
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'sys_role'
    ) INTO v_sys_role_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'global_role'
    ) INTO v_global_role_exists;
    
    -- Check constraint exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_sys_role_check'
    ) INTO v_constraint_exists;
    
    -- Get role distribution
    IF v_sys_role_exists THEN
        SELECT COUNT(*) INTO v_total_users FROM user_profiles;
        SELECT COUNT(*) INTO v_sys_owners FROM user_profiles WHERE sys_role = 'sys_owner';
        SELECT COUNT(*) INTO v_sys_admins FROM user_profiles WHERE sys_role = 'sys_admin';
        SELECT COUNT(*) INTO v_sys_users FROM user_profiles WHERE sys_role = 'sys_user';
    END IF;
    
    RAISE NOTICE '=== Migration Verification ==='';
    RAISE NOTICE 'sys_role column exists: %', v_sys_role_exists;
    RAISE NOTICE 'global_role column exists (should be false): %', v_global_role_exists;
    RAISE NOTICE 'sys_role constraint exists: %', v_constraint_exists;
    
    IF v_sys_role_exists THEN
        RAISE NOTICE '--- Role Distribution ---';
        RAISE NOTICE 'Total users: %', v_total_users;
        RAISE NOTICE 'sys_owner: %', v_sys_owners;
        RAISE NOTICE 'sys_admin: %', v_sys_admins;
        RAISE NOTICE 'sys_user: %', v_sys_users;
    END IF;
    
    IF v_sys_role_exists AND NOT v_global_role_exists AND v_constraint_exists THEN
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

BEGIN;

-- Add back the old column
ALTER TABLE public.user_profiles ADD COLUMN global_role VARCHAR(50);

-- Copy data back with reverse value mapping
UPDATE public.user_profiles SET global_role = 
  CASE 
    WHEN sys_role = 'sys_owner' THEN 'platform_owner'
    WHEN sys_role = 'sys_admin' THEN 'platform_admin'
    WHEN sys_role = 'sys_user' THEN 'platform_user'
  END;

-- Add old constraint
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_global_role_check 
CHECK (global_role IN ('platform_owner', 'platform_admin', 'platform_user'));

-- Drop new constraint and column
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_sys_role_check;
ALTER TABLE public.user_profiles DROP COLUMN sys_role;

-- Rename index back
ALTER INDEX IF EXISTS idx_user_profiles_sys_role RENAME TO idx_user_profiles_global_role;

COMMIT;
*/
