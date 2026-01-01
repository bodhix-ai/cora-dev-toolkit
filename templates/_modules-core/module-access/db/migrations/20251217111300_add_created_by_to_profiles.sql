-- =============================================
-- MIGRATION: Add created_by and updated_by columns to profiles
-- =============================================
-- Date: 2025-12-17
-- Purpose: Add created_by and updated_by columns to existing profiles tables
-- Note: This migration is idempotent and safe to run multiple times
-- Usage: Run this in existing projects that don't have these audit columns

-- =============================================
-- ADD COLUMN (Idempotent)
-- =============================================

-- Add created_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN created_by UUID;
        RAISE NOTICE 'Added created_by column to profiles table';
    ELSE
        RAISE NOTICE 'created_by column already exists in profiles table';
    END IF;
END $$;

-- Add updated_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN updated_by UUID;
        RAISE NOTICE 'Added updated_by column to profiles table';
    ELSE
        RAISE NOTICE 'updated_by column already exists in profiles table';
    END IF;
END $$;

-- =============================================
-- ADD INDEX (Idempotent)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_by ON public.profiles(updated_by);

-- =============================================
-- ADD FOREIGN KEY CONSTRAINT (Idempotent)
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_created_by_fkey'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint profiles_created_by_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint profiles_created_by_fkey already exists';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_updated_by_fkey'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint profiles_updated_by_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint profiles_updated_by_fkey already exists';
    END IF;
END $$;

-- =============================================
-- ADD COMMENT (Always safe to run)
-- =============================================

COMMENT ON COLUMN public.profiles.created_by IS 'User who created this profile (usually same as user_id for self-created)';
COMMENT ON COLUMN public.profiles.updated_by IS 'User who last updated this profile';

-- =============================================
-- VERIFICATION (Optional - uncomment to verify)
-- =============================================

-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('created_by', 'updated_by');
