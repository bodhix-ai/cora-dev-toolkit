-- Migration: Rename workspace_id to ws_id in voice_sessions table
-- Date: 2026-01-20
-- Module: module-voice
-- Purpose: Fix naming standard violation (ADR-011, Rule 3)
-- Context: Schema naming compliance audit - workspace_id should be ws_id
-- Reference: docs/standards/cora/standard_DATABASE-NAMING.md Rule 3
-- Plan: docs/plans/plan_schema-naming-compliance-audit.md

-- ============================================================================
-- STEP 1: Add new ws_id column (nullable initially)
-- ============================================================================
ALTER TABLE public.voice_sessions
ADD COLUMN IF NOT EXISTS ws_id uuid NULL;

-- ============================================================================
-- STEP 2: Copy data from workspace_id to ws_id
-- ============================================================================
UPDATE public.voice_sessions
SET ws_id = workspace_id
WHERE workspace_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Add foreign key constraint
-- ============================================================================
ALTER TABLE public.voice_sessions
ADD CONSTRAINT voice_sessions_ws_id_fkey 
FOREIGN KEY (ws_id) 
REFERENCES workspaces (id) 
ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: Add indexes for performance
-- ============================================================================
-- Single column index
CREATE INDEX IF NOT EXISTS idx_voice_sessions_ws_id 
ON public.voice_sessions USING btree (ws_id);

-- ============================================================================
-- STEP 5: Verify data copied correctly
-- ============================================================================
DO $$
DECLARE
    mismatched_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatched_count
    FROM public.voice_sessions
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
DROP POLICY IF EXISTS "voice_sessions_ws_admin" ON public.voice_sessions;
DROP POLICY IF EXISTS "voice_sessions_ws_member" ON public.voice_sessions;

-- ============================================================================
-- STEP 7: Drop old constraint and index
-- ============================================================================
ALTER TABLE public.voice_sessions
DROP CONSTRAINT IF EXISTS voice_sessions_workspace_id_fkey;

DROP INDEX IF EXISTS idx_voice_sessions_workspace_id;

-- ============================================================================
-- STEP 8: Drop old workspace_id column
-- ============================================================================
ALTER TABLE public.voice_sessions
DROP COLUMN IF EXISTS workspace_id;

-- ============================================================================
-- STEP 9: Recreate RLS policies with correct column name
-- ============================================================================

-- Policy: Workspace admins can manage voice sessions
CREATE POLICY "voice_sessions_ws_admin"
ON public.voice_sessions
FOR ALL
TO authenticated
USING (
    ws_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM ws_members wm
        WHERE wm.ws_id = voice_sessions.ws_id
          AND wm.user_id = auth.uid()
          AND wm.ws_role IN ('admin', 'owner')
    )
);

-- Policy: Workspace members can access voice sessions
CREATE POLICY "voice_sessions_ws_member"
ON public.voice_sessions
FOR SELECT
TO authenticated
USING (
    ws_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM ws_members wm
        WHERE wm.ws_id = voice_sessions.ws_id
          AND wm.user_id = auth.uid()
    )
);

-- ============================================================================
-- STEP 10: Update column comment
-- ============================================================================
COMMENT ON COLUMN public.voice_sessions.ws_id IS 'Workspace this voice session belongs to';

-- ============================================================================
-- STEP 11: Verify final state
-- ============================================================================
SELECT 
    COUNT(*) as total_sessions,
    COUNT(ws_id) as sessions_with_workspace,
    COUNT(*) - COUNT(ws_id) as sessions_without_workspace
FROM public.voice_sessions;

-- Verify column exists and workspace_id is gone
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'voice_sessions' 
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
WHERE tablename = 'voice_sessions'
ORDER BY policyname;

-- Migration complete notice
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete: voice_sessions.workspace_id → ws_id';
END $$;
