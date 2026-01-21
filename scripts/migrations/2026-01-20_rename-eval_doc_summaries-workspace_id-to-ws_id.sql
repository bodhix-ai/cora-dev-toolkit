-- Migration: Rename workspace_id to ws_id in eval_doc_summaries table
-- Date: 2026-01-20
-- Module: module-eval
-- Purpose: Fix naming standard violation (ADR-011, Rule 3)
-- Context: Schema naming compliance audit - workspace_id should be ws_id
-- Reference: docs/standards/cora/standard_DATABASE-NAMING.md Rule 3
-- Plan: docs/plans/plan_schema-naming-compliance-audit.md

-- ============================================================================
-- STEP 1: Add new ws_id column (nullable initially)
-- ============================================================================
ALTER TABLE public.eval_doc_summaries
ADD COLUMN IF NOT EXISTS ws_id uuid NULL;

-- ============================================================================
-- STEP 2: Copy data from workspace_id to ws_id
-- ============================================================================
UPDATE public.eval_doc_summaries
SET ws_id = workspace_id
WHERE workspace_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Add foreign key constraint
-- ============================================================================
ALTER TABLE public.eval_doc_summaries
ADD CONSTRAINT eval_doc_summaries_ws_id_fkey 
FOREIGN KEY (ws_id) 
REFERENCES workspaces (id) 
ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: Add index for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_eval_doc_summaries_ws_id 
ON public.eval_doc_summaries USING btree (ws_id);

-- ============================================================================
-- STEP 5: Verify data copied correctly
-- ============================================================================
DO $$
DECLARE
    mismatched_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatched_count
    FROM public.eval_doc_summaries
    WHERE (workspace_id IS NOT NULL AND ws_id IS NULL)
       OR (workspace_id IS NULL AND ws_id IS NOT NULL)
       OR (workspace_id != ws_id);
    
    IF mismatched_count > 0 THEN
        RAISE EXCEPTION 'Data mismatch detected: % rows have different workspace_id and ws_id values', mismatched_count;
    END IF;
    
    RAISE NOTICE 'Data verification passed: workspace_id and ws_id match for all rows';
END $$;

-- ============================================================================
-- STEP 6: Drop old RLS policies (they reference workspace_id)
-- ============================================================================
DROP POLICY IF EXISTS "eval_doc_summaries_ws_admin" ON public.eval_doc_summaries;
DROP POLICY IF EXISTS "eval_doc_summaries_ws_member_read" ON public.eval_doc_summaries;
DROP POLICY IF EXISTS "eval_doc_summaries_ws_admin_all" ON public.eval_doc_summaries;

-- ============================================================================
-- STEP 7: Drop old constraint and index
-- ============================================================================
ALTER TABLE public.eval_doc_summaries
DROP CONSTRAINT IF EXISTS eval_doc_summaries_workspace_id_fkey;

DROP INDEX IF EXISTS idx_eval_doc_summaries_workspace_id;

-- ============================================================================
-- STEP 8: Drop old workspace_id column
-- ============================================================================
ALTER TABLE public.eval_doc_summaries
DROP COLUMN IF EXISTS workspace_id;

-- ============================================================================
-- STEP 9: Make ws_id NOT NULL (now that data is migrated)
-- ============================================================================
ALTER TABLE public.eval_doc_summaries
ALTER COLUMN ws_id SET NOT NULL;

-- ============================================================================
-- STEP 10: Recreate RLS policies with correct column name
-- ============================================================================

-- Policy: Workspace admins have full access
CREATE POLICY "eval_doc_summaries_ws_admin"
ON public.eval_doc_summaries
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_members.ws_id = eval_doc_summaries.ws_id
          AND ws_members.user_id = auth.uid()
          AND ws_members.ws_role IN ('admin', 'owner')
    )
);

-- Policy: Workspace members can read
CREATE POLICY "eval_doc_summaries_ws_member_read"
ON public.eval_doc_summaries
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_members.ws_id = eval_doc_summaries.ws_id
          AND ws_members.user_id = auth.uid()
    )
);

-- ============================================================================
-- STEP 11: Update column comment
-- ============================================================================
COMMENT ON COLUMN public.eval_doc_summaries.ws_id IS 'Workspace this evaluation belongs to';

-- ============================================================================
-- STEP 12: Verify final state
-- ============================================================================
SELECT 
    COUNT(*) as total_summaries,
    COUNT(ws_id) as summaries_with_workspace,
    COUNT(*) - COUNT(ws_id) as summaries_without_workspace
FROM public.eval_doc_summaries;

-- Verify column exists and workspace_id is gone
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'eval_doc_summaries' 
  AND column_name IN ('ws_id', 'workspace_id')
ORDER BY column_name;

-- Verify RLS policies exist
SELECT 
    schemaname, 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'eval_doc_summaries'
ORDER BY policyname;

-- Migration complete notice
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete: eval_doc_summaries.workspace_id → ws_id';
END $$;
