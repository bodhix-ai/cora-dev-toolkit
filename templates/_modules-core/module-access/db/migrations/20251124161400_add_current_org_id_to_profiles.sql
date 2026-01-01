-- =============================================
-- MIGRATION: Add current_org_id to profiles
-- =============================================
-- Purpose: Adds the missing 'current_org_id' column to the 'profiles' table
--          to persist the user's currently selected organization.
--
-- Timestamp: 2025-11-24 16:14:00
-- =============================================

-- 1. Add the column to the profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_org_id UUID;

-- 2. Add a foreign key constraint to link to the 'orgs' table.
--    This ensures that the selected org actually exists.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'profiles_current_org_id_fkey'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_current_org_id_fkey
        FOREIGN KEY (current_org_id)
        REFERENCES public.orgs(id)
        ON DELETE SET NULL; -- If an org is deleted, nullify the selection
    END IF;
END;
$$;

-- 3. Add an index to optimize lookups by current_org_id
CREATE INDEX IF NOT EXISTS idx_profiles_current_org_id ON public.profiles(current_org_id);

-- 4. Add a comment to describe the column's purpose
COMMENT ON COLUMN public.profiles.current_org_id IS 'Persists the user''s currently selected organization across sessions.';
