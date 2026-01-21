-- Migration: Rename workspace_id to ws_id in kb_bases table
-- Date: 2026-01-20
-- Module: module-kb
-- Purpose: Fix naming standard violation (ADR-011, Rule 3)
-- Context: Schema naming compliance audit - workspace_id should be ws_id
-- Reference: docs/standards/cora/standard_DATABASE-NAMING.md Rule 3
-- Plan: docs/plans/plan_schema-naming-compliance-audit.md

-- ============================================================================
-- STEP 1: Add new ws_id column (nullable initially)
-- ============================================================================
ALTER TABLE public.kb_bases
ADD COLUMN IF NOT EXISTS ws_id uuid NULL;

-- ============================================================================
-- STEP 2: Copy data from workspace_id to ws_id
-- ============================================================================
UPDATE public.kb_bases
SET ws_id = workspace_id
WHERE workspace_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Add foreign key constraint
-- ============================================================================
ALTER TABLE public.kb_bases
ADD CONSTRAINT kb_bases_ws_id_fkey 
FOREIGN KEY (ws_id) 
REFERENCES workspaces (id) 
ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: Add indexes for performance
-- ============================================================================
-- Single column index
CREATE INDEX IF NOT EXISTS idx_kb_bases_ws_id 
ON public.kb_bases USING btree (ws_id) 
WHERE ws_id IS NOT NULL;

-- Composite index for scope filtering
CREATE INDEX IF NOT EXISTS idx_kb_bases_scope_ws 
ON public.kb_bases USING btree (scope, ws_id)
WHERE ws_id IS NOT NULL;

-- ============================================================================
-- STEP 5: Verify data copied correctly
-- ============================================================================
DO $$
DECLARE
    mismatched_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatched_count
    FROM public.kb_bases
    WHERE (workspace_id IS NOT NULL AND ws_id IS NULL)
       OR (workspace_id IS NULL AND ws_id IS NOT NULL)
       OR (workspace_id != ws_id);
    
    IF mismatched_count > 0 THEN
        RAISE EXCEPTION 'Data mismatch detected: % rows have different workspace_id and ws_id values', mismatched_count;
    END IF;
    
    RAISE NOTICE 'Data verification passed: workspace_id and ws_id match for all rows';
END $$;

-- ============================================================================
-- STEP 6: Drop old CHECK constraint (references workspace_id)
-- ============================================================================
ALTER TABLE public.kb_bases
DROP CONSTRAINT IF EXISTS kb_bases_scope_check;

-- ============================================================================
-- STEP 7: Recreate CHECK constraint with correct column name
-- ============================================================================
ALTER TABLE public.kb_bases
ADD CONSTRAINT kb_bases_scope_check CHECK (
    (scope = 'sys' AND org_id IS NULL AND ws_id IS NULL AND chat_session_id IS NULL) OR
    (scope = 'org' AND org_id IS NOT NULL AND ws_id IS NULL AND chat_session_id IS NULL) OR
    (scope = 'workspace' AND org_id IS NOT NULL AND ws_id IS NOT NULL AND chat_session_id IS NULL) OR
    (scope = 'chat' AND org_id IS NOT NULL AND chat_session_id IS NOT NULL)
);

-- ============================================================================
-- STEP 8: Drop old RLS policies (they reference workspace_id)
-- ============================================================================
DROP POLICY IF EXISTS "kb_bases_sys_read" ON public.kb_bases;
DROP POLICY IF EXISTS "kb_bases_org_member" ON public.kb_bases;
DROP POLICY IF EXISTS "kb_bases_ws_member" ON public.kb_bases;
DROP POLICY IF EXISTS "kb_bases_chat_participant" ON public.kb_bases;

-- ============================================================================
-- STEP 9: Drop old RPC functions (they use workspace_id parameter)
-- ============================================================================
DROP FUNCTION IF EXISTS get_accessible_kbs_for_workspace(uuid, uuid);

-- ============================================================================
-- STEP 10: Drop old constraints and indexes
-- ============================================================================
ALTER TABLE public.kb_bases
DROP CONSTRAINT IF EXISTS kb_bases_workspace_id_fkey;

DROP INDEX IF EXISTS idx_kb_bases_workspace_id;
DROP INDEX IF EXISTS idx_kb_bases_scope_workspace;

-- ============================================================================
-- STEP 11: Drop old workspace_id column
-- ============================================================================
ALTER TABLE public.kb_bases
DROP COLUMN IF EXISTS workspace_id;

-- ============================================================================
-- STEP 12: Recreate RLS policies with correct column name
-- ============================================================================

-- Policy: System-scoped KBs are readable by all authenticated users
CREATE POLICY "kb_bases_sys_read"
ON public.kb_bases
FOR SELECT
TO authenticated
USING (scope = 'sys');

-- Policy: Org members can access org-scoped KBs
CREATE POLICY "kb_bases_org_member"
ON public.kb_bases
FOR SELECT
TO authenticated
USING (
    scope = 'org'
    AND org_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM org_members om
        WHERE om.org_id = kb_bases.org_id
          AND om.user_id = auth.uid()
    )
);

-- Policy: Workspace members can access workspace-scoped KBs
CREATE POLICY "kb_bases_ws_member"
ON public.kb_bases
FOR SELECT
TO authenticated
USING (
    scope = 'workspace'
    AND ws_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM ws_members wm
        WHERE wm.ws_id = kb_bases.ws_id
          AND wm.user_id = auth.uid()
    )
);

-- Policy: Chat participants can access chat-scoped KBs
CREATE POLICY "kb_bases_chat_participant"
ON public.kb_bases
FOR SELECT
TO authenticated
USING (
    scope = 'chat'
    AND chat_session_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM chat_sessions cs
        WHERE cs.id = kb_bases.chat_session_id
          AND cs.created_by = auth.uid()
    )
);

-- ============================================================================
-- STEP 13: Recreate RPC function with correct parameter name
-- ============================================================================
CREATE OR REPLACE FUNCTION get_accessible_kbs_for_workspace(
    p_user_id uuid,
    p_ws_id uuid
)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    scope text,
    org_id uuid,
    ws_id uuid,
    chat_session_id uuid,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workspace RECORD;
BEGIN
    -- Verify user has access to workspace
    SELECT * INTO v_workspace 
    FROM public.workspaces 
    WHERE id = p_ws_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace not found';
    END IF;

    -- Verify user is a member of the workspace
    IF NOT EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = v_workspace.id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this workspace';
    END IF;

    -- Return accessible KBs
    RETURN QUERY
    SELECT 
        kb.id,
        kb.name,
        kb.description,
        kb.scope,
        kb.org_id,
        kb.ws_id,
        kb.chat_session_id,
        kb.created_at,
        kb.updated_at
    FROM kb_bases kb
    WHERE 
        -- System KBs
        kb.scope = 'sys'
        OR
        -- Org KBs for this workspace's org
        (kb.scope = 'org' AND kb.org_id = v_workspace.org_id)
        OR
        -- Workspace-specific KBs
        (kb.scope = 'workspace' AND kb.ws_id = p_ws_id)
        OR
        -- KBs shared with this workspace
        EXISTS (
            SELECT 1 FROM kb_access_ws kaw
            WHERE kaw.kb_id = kb.id AND kaw.ws_id = p_ws_id
        )
    ORDER BY kb.created_at DESC;
END;
$$;

-- ============================================================================
-- STEP 14: Update column comment
-- ============================================================================
COMMENT ON COLUMN public.kb_bases.ws_id IS 'Workspace ID (for workspace-scoped KBs)';

-- ============================================================================
-- STEP 15: Verify final state
-- ============================================================================
SELECT 
    COUNT(*) as total_kbs,
    COUNT(ws_id) as kbs_with_workspace,
    COUNT(*) - COUNT(ws_id) as kbs_without_workspace
FROM public.kb_bases;

-- Verify column exists and workspace_id is gone
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'kb_bases' 
  AND column_name IN ('ws_id', 'workspace_id')
ORDER BY column_name;

-- Verify CHECK constraint exists
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'kb_bases_scope_check';

-- Verify RLS policies exist
SELECT 
    schemaname, 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'kb_bases'
ORDER BY policyname;

-- Verify function exists with correct signature
SELECT 
    routine_name,
    data_type as return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_accessible_kbs_for_workspace'
  AND routine_schema = 'public';

RAISE NOTICE '✅ Migration complete: kb_bases.workspace_id → ws_id';
