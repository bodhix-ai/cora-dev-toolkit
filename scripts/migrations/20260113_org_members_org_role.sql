-- =============================================================================
-- Migration: Rename role to org_role in org_members
-- =============================================================================
-- Date: January 13, 2026
-- Purpose: Rename role column to org_role for clarity
-- Changes:
--   - Column: role → org_role
--   - Index: idx_org_members_role → idx_org_members_org_role
--   - Index: idx_org_members_org_role (composite) → idx_org_members_org_org_role
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
        AND table_name = 'org_members' 
        AND column_name = 'role'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'org_members' 
        AND column_name = 'org_role'
    ) THEN
        -- Step 1: Add new column with default
        ALTER TABLE public.org_members 
        ADD COLUMN org_role TEXT NOT NULL DEFAULT 'org_user';
        
        RAISE NOTICE 'Added org_role column with default org_user';
        
        -- Step 2: Copy data from old column (values stay the same)
        UPDATE public.org_members 
        SET org_role = COALESCE(role, 'org_user');
        
        RAISE NOTICE 'Migrated role values to org_role';
        
        -- Step 3: Add constraint
        ALTER TABLE public.org_members
        ADD CONSTRAINT org_members_org_role_check 
        CHECK (org_role IN ('org_owner', 'org_admin', 'org_user'));
        
        RAISE NOTICE 'Added org_role constraint';
        
        -- Step 4: Drop old constraint (if exists)
        ALTER TABLE public.org_members
        DROP CONSTRAINT IF EXISTS org_members_role_check;
        
        -- Step 5: Drop old column
        ALTER TABLE public.org_members
        DROP COLUMN role;
        
        RAISE NOTICE 'Dropped role column';
        
        -- Step 6: Add comment
        COMMENT ON COLUMN public.org_members.org_role IS 
        'Organization-level role. Values: org_owner (full access), org_admin (admin), org_user (regular member - default)';
        
        RAISE NOTICE 'Column migration complete: role → org_role';
    ELSE
        RAISE NOTICE 'Column org_role already exists or role does not exist - skipping migration';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Update indexes
-- =============================================================================

DO $$
BEGIN
    -- Rename single column index
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_members_role') THEN
        ALTER INDEX idx_org_members_role RENAME TO idx_org_members_org_role;
        RAISE NOTICE 'Renamed index: idx_org_members_role → idx_org_members_org_role';
    ELSIF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_members_org_role') THEN
        CREATE INDEX idx_org_members_org_role ON public.org_members(org_role);
        RAISE NOTICE 'Created new index: idx_org_members_org_role';
    ELSE
        RAISE NOTICE 'Index idx_org_members_org_role already exists - skipping';
    END IF;
    
    -- Create composite index if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_org_members_org_org_role') THEN
        CREATE INDEX idx_org_members_org_org_role ON public.org_members(org_id, org_role);
        RAISE NOTICE 'Created composite index: idx_org_members_org_org_role';
    ELSE
        RAISE NOTICE 'Index idx_org_members_org_org_role already exists - skipping';
    END IF;
END $$;

-- =============================================================================
-- STEP 3: Update RLS policies (if they reference old column)
-- =============================================================================

-- Recreate policies that reference the role column
-- These are idempotent because we DROP IF EXISTS before CREATE

-- Org owners can add members
DROP POLICY IF EXISTS "Org owners can add members" ON public.org_members;
CREATE POLICY "Org owners can add members" ON public.org_members
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
              AND om.org_role = 'org_owner'
        )
    );

-- Org owners can update members
DROP POLICY IF EXISTS "Org owners can update members" ON public.org_members;
CREATE POLICY "Org owners can update members" ON public.org_members
    FOR UPDATE 
    TO authenticated
    USING (
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
              AND om.org_role = 'org_owner'
        )
    )
    WITH CHECK (
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
              AND om.org_role = 'org_owner'
        )
    );

-- Org owners can remove members
DROP POLICY IF EXISTS "Org owners can remove members" ON public.org_members;
CREATE POLICY "Org owners can remove members" ON public.org_members
    FOR DELETE 
    TO authenticated
    USING (
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
              AND om.org_role = 'org_owner'
        )
    );

RAISE NOTICE 'Updated RLS policies to use org_role';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    v_org_role_exists BOOLEAN;
    v_role_exists BOOLEAN;
    v_constraint_exists BOOLEAN;
    v_total_members INTEGER;
    v_org_owners INTEGER;
    v_org_admins INTEGER;
    v_org_users INTEGER;
BEGIN
    -- Check column existence
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'org_members' 
        AND column_name = 'org_role'
    ) INTO v_org_role_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'org_members' 
        AND column_name = 'role'
    ) INTO v_role_exists;
    
    -- Check constraint exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'org_members_org_role_check'
    ) INTO v_constraint_exists;
    
    -- Get role distribution
    IF v_org_role_exists THEN
        SELECT COUNT(*) INTO v_total_members FROM org_members;
        SELECT COUNT(*) INTO v_org_owners FROM org_members WHERE org_role = 'org_owner';
        SELECT COUNT(*) INTO v_org_admins FROM org_members WHERE org_role = 'org_admin';
        SELECT COUNT(*) INTO v_org_users FROM org_members WHERE org_role = 'org_user';
    END IF;
    
    RAISE NOTICE '=== Migration Verification ===';
    RAISE NOTICE 'org_role column exists: %', v_org_role_exists;
    RAISE NOTICE 'role column exists (should be false): %', v_role_exists;
    RAISE NOTICE 'org_role constraint exists: %', v_constraint_exists;
    
    IF v_org_role_exists THEN
        RAISE NOTICE '--- Role Distribution ---';
        RAISE NOTICE 'Total members: %', v_total_members;
        RAISE NOTICE 'org_owner: %', v_org_owners;
        RAISE NOTICE 'org_admin: %', v_org_admins;
        RAISE NOTICE 'org_user: %', v_org_users;
    END IF;
    
    IF v_org_role_exists AND NOT v_role_exists AND v_constraint_exists THEN
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
ALTER TABLE public.org_members ADD COLUMN role TEXT NOT NULL DEFAULT 'org_user';

-- Copy data back
UPDATE public.org_members SET role = org_role;

-- Add old constraint
ALTER TABLE public.org_members
ADD CONSTRAINT org_members_role_check 
CHECK (role IN ('org_owner', 'org_admin', 'org_user'));

-- Drop new constraint and column
ALTER TABLE public.org_members DROP CONSTRAINT IF EXISTS org_members_org_role_check;
ALTER TABLE public.org_members DROP COLUMN org_role;

-- Rename index back
ALTER INDEX IF EXISTS idx_org_members_org_role RENAME TO idx_org_members_role;

-- Recreate RLS policies with old column name
-- (copy from old schema and replace org_role with role)

COMMIT;
*/
