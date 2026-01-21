-- Migration: Rename workspace_id to ws_id in chat_sessions table
-- Date: 2026-01-20
-- Module: module-chat
-- Purpose: Fix naming standard violation (ADR-011, Rule 3)
-- Context: Schema naming compliance audit - workspace_id should be ws_id
-- Reference: docs/standards/cora/standard_DATABASE-NAMING.md Rule 3
-- Plan: docs/plans/plan_schema-naming-compliance-audit.md

-- ============================================================================
-- STEP 1: Add new ws_id column (nullable initially)
-- ============================================================================
ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS ws_id uuid NULL;

-- ============================================================================
-- STEP 2: Copy data from workspace_id to ws_id
-- ============================================================================
UPDATE public.chat_sessions
SET ws_id = workspace_id
WHERE workspace_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Add foreign key constraint
-- ============================================================================
ALTER TABLE public.chat_sessions
ADD CONSTRAINT chat_sessions_ws_id_fkey 
FOREIGN KEY (ws_id) 
REFERENCES workspaces (id) 
ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: Add indexes for performance
-- ============================================================================
-- Single column index
CREATE INDEX IF NOT EXISTS idx_chat_sessions_ws_id 
ON public.chat_sessions USING btree (ws_id);

-- Composite index (replaces idx_chat_sessions_ws_user)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_ws_user 
ON public.chat_sessions USING btree (ws_id, created_by) 
WHERE is_deleted = false;

-- ============================================================================
-- STEP 5: Verify data copied correctly
-- ============================================================================
DO $$
DECLARE
    mismatched_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatched_count
    FROM public.chat_sessions
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
DROP POLICY IF EXISTS "chat_sessions_ws_member" ON public.chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_ws_admin" ON public.chat_sessions;

-- ============================================================================
-- STEP 7: Drop old RPC functions (they use workspace_id parameter)
-- ============================================================================
DROP FUNCTION IF EXISTS get_chat_sessions_for_user(uuid, uuid);

-- ============================================================================
-- STEP 8: Drop old constraints and indexes
-- ============================================================================
ALTER TABLE public.chat_sessions
DROP CONSTRAINT IF EXISTS chat_sessions_workspace_id_fkey;

DROP INDEX IF EXISTS idx_chat_sessions_workspace_id;
DROP INDEX IF EXISTS idx_chat_sessions_ws_user_old;

-- ============================================================================
-- STEP 9: Drop old workspace_id column
-- ============================================================================
ALTER TABLE public.chat_sessions
DROP COLUMN IF EXISTS workspace_id;

-- ============================================================================
-- STEP 10: Recreate RLS policies with correct column name
-- ============================================================================

-- Policy: Workspace members can access their workspace's chat sessions
CREATE POLICY "chat_sessions_ws_member"
ON public.chat_sessions
FOR SELECT
TO authenticated
USING (
    ws_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM ws_members wm
        WHERE wm.ws_id = chat_sessions.ws_id
          AND wm.user_id = auth.uid()
    )
);

-- Policy: Workspace admins can manage workspace chat sessions
CREATE POLICY "chat_sessions_ws_admin"
ON public.chat_sessions
FOR ALL
TO authenticated
USING (
    ws_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM ws_members wm
        WHERE wm.ws_id = chat_sessions.ws_id
          AND wm.user_id = auth.uid()
          AND wm.ws_role IN ('admin', 'owner')
    )
);

-- ============================================================================
-- STEP 11: Recreate RPC function with correct parameter name
-- ============================================================================
CREATE OR REPLACE FUNCTION get_chat_sessions_for_user(
    p_user_id uuid,
    p_ws_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    org_id uuid,
    ws_id uuid,
    created_by uuid,
    title text,
    is_deleted boolean,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.org_id,
        cs.ws_id,
        cs.created_by,
        cs.title,
        cs.is_deleted,
        cs.created_at,
        cs.updated_at
    FROM chat_sessions cs
    WHERE cs.created_by = p_user_id
      AND cs.is_deleted = false
      AND (p_ws_id IS NULL OR cs.ws_id = p_ws_id)
    ORDER BY cs.updated_at DESC;
END;
$$;

-- ============================================================================
-- STEP 12: Update column comment
-- ============================================================================
COMMENT ON COLUMN public.chat_sessions.ws_id IS 'Workspace (for workspace-scoped chats, NULL for user-level chats)';

-- ============================================================================
-- STEP 13: Verify final state
-- ============================================================================
SELECT 
    COUNT(*) as total_sessions,
    COUNT(ws_id) as sessions_with_workspace,
    COUNT(*) - COUNT(ws_id) as sessions_without_workspace
FROM public.chat_sessions;

-- Verify column exists and workspace_id is gone
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_sessions' 
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
WHERE tablename = 'chat_sessions'
ORDER BY policyname;

-- Verify function exists with correct signature
SELECT 
    routine_name,
    data_type as return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_chat_sessions_for_user'
  AND routine_schema = 'public';

-- Migration complete notice
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete: chat_sessions.workspace_id → ws_id';
END $$;
