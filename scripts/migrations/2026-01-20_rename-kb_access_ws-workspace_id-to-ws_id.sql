-- Migration: Rename workspace_id to ws_id in kb_access_ws table
-- Date: 2026-01-20
-- Module: module-kb
-- Purpose: Fix naming standard violation (ADR-011, Rule 3)
-- Context: Schema naming compliance audit - workspace_id should be ws_id
-- Reference: docs/standards/cora/standard_DATABASE-NAMING.md Rule 3
-- Plan: docs/plans/plan_schema-naming-compliance-audit.md

-- ============================================================================
-- STEP 1: Add new ws_id column (nullable initially)
-- ============================================================================
ALTER TABLE public.kb_access_ws
ADD COLUMN IF NOT EXISTS ws_id uuid NULL;

-- ============================================================================
-- STEP 2: Copy data from workspace_id to ws_id
-- ============================================================================
UPDATE public.kb_access_ws
SET ws_id = workspace_id
WHERE workspace_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Add foreign key constraint
-- ============================================================================
ALTER TABLE public.kb_access_ws
ADD CONSTRAINT kb_access_ws_ws_id_fkey 
FOREIGN KEY (ws_id) 
REFERENCES workspaces (id) 
ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: Add index for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_kb_access_ws_ws_id 
ON public.kb_access_ws USING btree (ws_id);

-- ============================================================================
-- STEP 5: Verify data copied correctly
-- ============================================================================
DO $$
DECLARE
    mismatched_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatched_count
    FROM public.kb_access_ws
    WHERE (workspace_id IS NOT NULL AND ws_id IS NULL)
       OR (workspace_id IS NULL AND ws_id IS NOT NULL)
       OR (workspace_id != ws_id);
    
    IF mismatched_count > 0 THEN
        RAISE EXCEPTION 'Data mismatch detected: % rows have different workspace_id and ws_id values', mismatched_count;
    END IF;
    
    RAISE NOTICE 'Data verification passed: workspace_id and ws_id match for all rows';
END $$;

-- ============================================================================
-- STEP 6: Drop old UNIQUE constraint (references workspace_id)
-- ============================================================================
ALTER TABLE public.kb_access_ws
DROP CONSTRAINT IF EXISTS kb_access_ws_unique;

-- ============================================================================
-- STEP 7: Recreate UNIQUE constraint with correct column name
-- ============================================================================
ALTER TABLE public.kb_access_ws
ADD CONSTRAINT kb_access_ws_unique UNIQUE (kb_id, ws_id);

-- ============================================================================
-- STEP 8: Drop old RLS policies (they reference workspace_id)
-- ============================================================================
DROP POLICY IF EXISTS "kb_access_ws_admin" ON public.kb_access_ws;
DROP POLICY IF EXISTS "kb_access_ws_read" ON public.kb_access_ws;

-- ============================================================================
-- STEP 9: Drop old constraint and index
-- ============================================================================
ALTER TABLE public.kb_access_ws
DROP CONSTRAINT IF EXISTS kb_access_ws_workspace_id_fkey;

DROP INDEX IF EXISTS idx_kb_access_ws_workspace_id;

-- ============================================================================
-- STEP 10: Drop old workspace_id column
-- ============================================================================
ALTER TABLE public.kb_access_ws
DROP COLUMN IF EXISTS workspace_id;

-- ============================================================================
-- STEP 11: Make ws_id NOT NULL (now that data is migrated)
-- ============================================================================
ALTER TABLE public.kb_access_ws
ALTER COLUMN ws_id SET NOT NULL;

-- ============================================================================
-- STEP 12: Recreate RLS policies with correct column name
-- ============================================================================

-- Policy: Workspace admins can manage KB access for their workspaces
CREATE POLICY "kb_access_ws_admin"
ON public.kb_access_ws
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM ws_members wm
        WHERE wm.ws_id = kb_access_ws.ws_id
          AND wm.user_id = auth.uid()
          AND wm.ws_role IN ('admin', 'owner')
    )
);

-- Policy: Workspace members can read KB access configurations
CREATE POLICY "kb_access_ws_read"
ON public.kb_access_ws
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM ws_members wm
        WHERE wm.ws_id = kb_access_ws.ws_id
          AND wm.user_id = auth.uid()
    )
);

-- ============================================================================
-- STEP 13: Update column comment
-- ============================================================================
COMMENT ON COLUMN public.kb_access_ws.ws_id IS 'Workspace that has access to the KB';

-- ============================================================================
-- STEP 14: Verify final state
-- ============================================================================
SELECT 
    COUNT(*) as total_access_grants,
    COUNT(DISTINCT ws_id) as unique_workspaces,
    COUNT(DISTINCT kb_id) as unique_kbs
FROM public.kb_access_ws;

-- Verify column exists and workspace_id is gone
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'kb_access_ws' 
  AND column_name IN ('ws_id', 'workspace_id')
ORDER BY column_name;

-- Verify UNIQUE constraint exists
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'kb_access_ws'
  AND constraint_name = 'kb_access_ws_unique';

-- Verify RLS policies exist
SELECT 
    schemaname, 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'kb_access_ws'
ORDER BY policyname;

-- Migration complete notice
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete: kb_access_ws.workspace_id → ws_id';
END $$;
