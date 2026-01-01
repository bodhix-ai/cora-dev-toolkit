-- =============================================================================
-- Migration: Add Bootstrap & Denied Access Columns
-- =============================================================================
-- Date: December 20, 2025
-- Purpose: Add missing columns for bootstrap scenario and denied access handling
-- 
-- Changes:
--   1. Add `requires_invitation` to profiles table
--   2. Add `created_by` and `updated_by` to orgs table (if not exists)
--
-- Idempotent: Safe to run multiple times
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add requires_invitation to profiles table
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    -- Add requires_invitation column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'requires_invitation'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN requires_invitation BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added requires_invitation column to profiles table';
    ELSE
        RAISE NOTICE 'requires_invitation column already exists in profiles table';
    END IF;
END $$;

-- Add index for requires_invitation (if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_requires_invitation 
    ON public.profiles(requires_invitation) 
    WHERE requires_invitation = TRUE;

-- Add comment
COMMENT ON COLUMN public.profiles.requires_invitation IS 'TRUE if user was denied auto-provisioning and requires explicit invitation';

-- -----------------------------------------------------------------------------
-- 2. Add created_by and updated_by to orgs table
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.orgs 
        ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added created_by column to orgs table';
    ELSE
        RAISE NOTICE 'created_by column already exists in orgs table';
    END IF;
    
    -- Add updated_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE public.orgs 
        ADD COLUMN updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added updated_by column to orgs table';
    ELSE
        RAISE NOTICE 'updated_by column already exists in orgs table';
    END IF;
END $$;

-- Add indexes for audit columns (if not exist)
CREATE INDEX IF NOT EXISTS idx_orgs_created_by ON public.orgs(created_by);
CREATE INDEX IF NOT EXISTS idx_orgs_updated_by ON public.orgs(updated_by);

-- Add comments
COMMENT ON COLUMN public.orgs.created_by IS 'User who created this organization';
COMMENT ON COLUMN public.orgs.updated_by IS 'User who last updated this organization';

-- -----------------------------------------------------------------------------
-- Verification Query
-- -----------------------------------------------------------------------------

-- Verify columns exist
DO $$
DECLARE
    v_profiles_column_exists BOOLEAN;
    v_orgs_created_by_exists BOOLEAN;
    v_orgs_updated_by_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'requires_invitation'
    ) INTO v_profiles_column_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name = 'created_by'
    ) INTO v_orgs_created_by_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orgs' 
        AND column_name = 'updated_by'
    ) INTO v_orgs_updated_by_exists;
    
    IF v_profiles_column_exists AND v_orgs_created_by_exists AND v_orgs_updated_by_exists THEN
        RAISE NOTICE '✅ Migration successful - all columns exist';
    ELSE
        RAISE EXCEPTION '❌ Migration failed - some columns are missing';
    END IF;
END $$;

-- =============================================================================
-- Migration Complete
-- =============================================================================
