-- Migration: Update kb_docs RLS policies to use ws_id instead of workspace_id
-- Date: 2026-01-20
-- Purpose: Fix 406 Not Acceptable errors when querying kb_docs with ws_id filter
-- Related: Phase 1 document summary failures in eval-processor

-- ============================================================================
-- STEP 1: Drop old RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "workspace_isolation" ON kb_docs;
DROP POLICY IF EXISTS "Users can read kb_docs in their workspace" ON kb_docs;
DROP POLICY IF EXISTS "Users can insert kb_docs in their workspace" ON kb_docs;
DROP POLICY IF EXISTS "Users can update kb_docs in their workspace" ON kb_docs;
DROP POLICY IF EXISTS "Users can delete kb_docs in their workspace" ON kb_docs;
DROP POLICY IF EXISTS "workspace_isolation_select" ON kb_docs;
DROP POLICY IF EXISTS "workspace_isolation_insert" ON kb_docs;
DROP POLICY IF EXISTS "workspace_isolation_update" ON kb_docs;
DROP POLICY IF EXISTS "workspace_isolation_delete" ON kb_docs;

-- ============================================================================
-- STEP 2: Create new RLS policies using ws_id
-- ============================================================================

-- SELECT policy
CREATE POLICY "workspace_isolation_select" ON kb_docs
    FOR SELECT
    USING (
        ws_id IN (
            SELECT ws_id 
            FROM ws_members 
            WHERE user_id = auth.uid()
        )
    );

-- INSERT policy
CREATE POLICY "workspace_isolation_insert" ON kb_docs
    FOR INSERT
    WITH CHECK (
        ws_id IN (
            SELECT ws_id 
            FROM ws_members 
            WHERE user_id = auth.uid()
        )
    );

-- UPDATE policy
CREATE POLICY "workspace_isolation_update" ON kb_docs
    FOR UPDATE
    USING (
        ws_id IN (
            SELECT ws_id 
            FROM ws_members 
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        ws_id IN (
            SELECT ws_id 
            FROM ws_members 
            WHERE user_id = auth.uid()
        )
    );

-- DELETE policy
CREATE POLICY "workspace_isolation_delete" ON kb_docs
    FOR DELETE
    USING (
        ws_id IN (
            SELECT ws_id 
            FROM ws_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 3: Update kb_chunks policies (they reference kb_docs)
-- ============================================================================

DROP POLICY IF EXISTS "workspace_isolation" ON kb_chunks;
DROP POLICY IF EXISTS "kb_chunks_workspace_isolation" ON kb_chunks;

CREATE POLICY "kb_chunks_workspace_isolation" ON kb_chunks
    FOR SELECT
    USING (
        document_id IN (
            SELECT id 
            FROM kb_docs 
            WHERE ws_id IN (
                SELECT ws_id 
                FROM ws_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- STEP 4: Reload PostgREST schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION QUERIES (commented out, run manually if needed)
-- ============================================================================

-- Verify new policies are in place:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'kb_docs'
-- ORDER BY policyname;

-- Verify the column exists:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'kb_docs' 
-- AND column_name IN ('workspace_id', 'ws_id');

-- Test query that eval-processor uses:
-- SELECT id, ws_id, extracted_text 
-- FROM kb_docs 
-- WHERE id = 'd48ed7ad-69d8-4da5-85b1-2def7f60f0b0'
-- AND ws_id = '224949de-c080-497c-ae35-f1372f880b96';
