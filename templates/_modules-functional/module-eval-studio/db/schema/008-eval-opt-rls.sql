-- ============================================================================
-- Module: module-eval-optimizer
-- Migration: 005-eval-opt-rls
-- Description: Row Level Security policies for eval optimizer tables
-- ============================================================================

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE eval_opt_doc_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_doc_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_truth_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_run_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_response_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_context_docs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DOCUMENT GROUPS
-- ============================================================================

-- Select: Users can see document groups for workspaces they belong to
DROP POLICY IF EXISTS eval_opt_doc_groups_select ON eval_opt_doc_groups;
CREATE POLICY eval_opt_doc_groups_select ON eval_opt_doc_groups
    FOR SELECT
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Insert: Workspace members can create document groups
DROP POLICY IF EXISTS eval_opt_doc_groups_insert ON eval_opt_doc_groups;
CREATE POLICY eval_opt_doc_groups_insert ON eval_opt_doc_groups
    FOR INSERT
    WITH CHECK (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Update: Workspace members can update document groups
DROP POLICY IF EXISTS eval_opt_doc_groups_update ON eval_opt_doc_groups;
CREATE POLICY eval_opt_doc_groups_update ON eval_opt_doc_groups
    FOR UPDATE
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Delete: Workspace owners and admins can delete document groups
DROP POLICY IF EXISTS eval_opt_doc_groups_delete ON eval_opt_doc_groups;
CREATE POLICY eval_opt_doc_groups_delete ON eval_opt_doc_groups
    FOR DELETE
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid() AND ws_role IN ('owner', 'admin')
    ));

-- ============================================================================
-- DOCUMENT GROUP MEMBERS
-- ============================================================================

-- Select: Users can see document group members for their workspaces
DROP POLICY IF EXISTS eval_opt_doc_group_members_select ON eval_opt_doc_group_members;
CREATE POLICY eval_opt_doc_group_members_select ON eval_opt_doc_group_members
    FOR SELECT
    USING (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Insert: Workspace members can add documents to groups
DROP POLICY IF EXISTS eval_opt_doc_group_members_insert ON eval_opt_doc_group_members;
CREATE POLICY eval_opt_doc_group_members_insert ON eval_opt_doc_group_members
    FOR INSERT
    WITH CHECK (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Delete: Workspace members can remove documents from groups
DROP POLICY IF EXISTS eval_opt_doc_group_members_delete ON eval_opt_doc_group_members;
CREATE POLICY eval_opt_doc_group_members_delete ON eval_opt_doc_group_members
    FOR DELETE
    USING (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- ============================================================================
-- TRUTH KEYS
-- ============================================================================

-- Select: Users can see truth keys for their workspaces
DROP POLICY IF EXISTS eval_opt_truth_keys_select ON eval_opt_truth_keys;
CREATE POLICY eval_opt_truth_keys_select ON eval_opt_truth_keys
    FOR SELECT
    USING (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Insert: Workspace members can create truth keys
DROP POLICY IF EXISTS eval_opt_truth_keys_insert ON eval_opt_truth_keys;
CREATE POLICY eval_opt_truth_keys_insert ON eval_opt_truth_keys
    FOR INSERT
    WITH CHECK (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Update: Workspace members can update truth keys
DROP POLICY IF EXISTS eval_opt_truth_keys_update ON eval_opt_truth_keys;
CREATE POLICY eval_opt_truth_keys_update ON eval_opt_truth_keys
    FOR UPDATE
    USING (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Delete: Workspace owners and admins can delete truth keys
DROP POLICY IF EXISTS eval_opt_truth_keys_delete ON eval_opt_truth_keys;
CREATE POLICY eval_opt_truth_keys_delete ON eval_opt_truth_keys
    FOR DELETE
    USING (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid() AND ws_role IN ('owner', 'admin')
        )
    ));

-- ============================================================================
-- RUNS
-- ============================================================================

-- Select: Users can see runs for their workspaces
DROP POLICY IF EXISTS eval_opt_runs_select ON eval_opt_runs;
CREATE POLICY eval_opt_runs_select ON eval_opt_runs
    FOR SELECT
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Insert: Workspace members can create runs
DROP POLICY IF EXISTS eval_opt_runs_insert ON eval_opt_runs;
CREATE POLICY eval_opt_runs_insert ON eval_opt_runs
    FOR INSERT
    WITH CHECK (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Update: System can update run status (for background processing)
DROP POLICY IF EXISTS eval_opt_runs_update ON eval_opt_runs;
CREATE POLICY eval_opt_runs_update ON eval_opt_runs
    FOR UPDATE
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Delete: Workspace owners and admins can delete runs
DROP POLICY IF EXISTS eval_opt_runs_delete ON eval_opt_runs;
CREATE POLICY eval_opt_runs_delete ON eval_opt_runs
    FOR DELETE
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid() AND ws_role IN ('owner', 'admin')
    ));

-- ============================================================================
-- RUN RESULTS
-- ============================================================================

-- Select: Users can see run results for their workspaces
DROP POLICY IF EXISTS eval_opt_run_results_select ON eval_opt_run_results;
CREATE POLICY eval_opt_run_results_select ON eval_opt_run_results
    FOR SELECT
    USING (run_id IN (
        SELECT id FROM eval_opt_runs
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Insert: System can create run results (during optimization runs)
DROP POLICY IF EXISTS eval_opt_run_results_insert ON eval_opt_run_results;
CREATE POLICY eval_opt_run_results_insert ON eval_opt_run_results
    FOR INSERT
    WITH CHECK (run_id IN (
        SELECT id FROM eval_opt_runs
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Delete: Cascade delete with run (no direct delete policy needed)

-- ============================================================================
-- RESPONSE STRUCTURES
-- ============================================================================

-- Select: Users can see response structures for their workspaces
DROP POLICY IF EXISTS eval_opt_response_structures_select ON eval_opt_response_structures;
CREATE POLICY eval_opt_response_structures_select ON eval_opt_response_structures
    FOR SELECT
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Insert: Workspace members can create response structures
DROP POLICY IF EXISTS eval_opt_response_structures_insert ON eval_opt_response_structures;
CREATE POLICY eval_opt_response_structures_insert ON eval_opt_response_structures
    FOR INSERT
    WITH CHECK (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Update: Workspace members can update response structures
DROP POLICY IF EXISTS eval_opt_response_structures_update ON eval_opt_response_structures;
CREATE POLICY eval_opt_response_structures_update ON eval_opt_response_structures
    FOR UPDATE
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Delete: Workspace owners and admins can delete response structures
DROP POLICY IF EXISTS eval_opt_response_structures_delete ON eval_opt_response_structures;
CREATE POLICY eval_opt_response_structures_delete ON eval_opt_response_structures
    FOR DELETE
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid() AND ws_role IN ('owner', 'admin')
    ));

-- ============================================================================
-- CONTEXT DOCUMENTS (Phase 4A)
-- ============================================================================

-- Select: Users can see context docs for their workspaces
DROP POLICY IF EXISTS eval_opt_context_docs_select ON eval_opt_context_docs;
CREATE POLICY eval_opt_context_docs_select ON eval_opt_context_docs
    FOR SELECT
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Insert: Workspace members can upload context docs
DROP POLICY IF EXISTS eval_opt_context_docs_insert ON eval_opt_context_docs;
CREATE POLICY eval_opt_context_docs_insert ON eval_opt_context_docs
    FOR INSERT
    WITH CHECK (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Update: Workspace members can update context docs (e.g., after RAG extraction)
DROP POLICY IF EXISTS eval_opt_context_docs_update ON eval_opt_context_docs;
CREATE POLICY eval_opt_context_docs_update ON eval_opt_context_docs
    FOR UPDATE
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid()
    ));

-- Delete: Workspace owners and admins can delete context docs
DROP POLICY IF EXISTS eval_opt_context_docs_delete ON eval_opt_context_docs;
CREATE POLICY eval_opt_context_docs_delete ON eval_opt_context_docs
    FOR DELETE
    USING (ws_id IN (
        SELECT ws_id FROM ws_members
        WHERE user_id = auth.uid() AND ws_role IN ('owner', 'admin')
    ));

-- ============================================================================
-- RUN PHASES (Sprint 5 Phase 2)
-- ============================================================================

-- Enable RLS
ALTER TABLE eval_opt_run_phases ENABLE ROW LEVEL SECURITY;

-- Select: Users can see run phases for their workspaces
DROP POLICY IF EXISTS eval_opt_run_phases_select ON eval_opt_run_phases;
CREATE POLICY eval_opt_run_phases_select ON eval_opt_run_phases
    FOR SELECT
    USING (run_id IN (
        SELECT id FROM eval_opt_runs
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Insert: System can create run phases (during optimization runs)
DROP POLICY IF EXISTS eval_opt_run_phases_insert ON eval_opt_run_phases;
CREATE POLICY eval_opt_run_phases_insert ON eval_opt_run_phases
    FOR INSERT
    WITH CHECK (run_id IN (
        SELECT id FROM eval_opt_runs
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Update: System can update run phases (status, duration, etc.)
DROP POLICY IF EXISTS eval_opt_run_phases_update ON eval_opt_run_phases;
CREATE POLICY eval_opt_run_phases_update ON eval_opt_run_phases
    FOR UPDATE
    USING (run_id IN (
        SELECT id FROM eval_opt_runs
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Delete: Cascade delete with run (no direct delete policy needed)

-- ============================================================================
-- VARIATION PROGRESS (Sprint 5 Phase 2)
-- ============================================================================

-- Enable RLS
ALTER TABLE eval_opt_variation_progress ENABLE ROW LEVEL SECURITY;

-- Select: Users can see variation progress for their workspaces
DROP POLICY IF EXISTS eval_opt_variation_progress_select ON eval_opt_variation_progress;
CREATE POLICY eval_opt_variation_progress_select ON eval_opt_variation_progress
    FOR SELECT
    USING (run_id IN (
        SELECT id FROM eval_opt_runs
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Insert: System can create variation progress (during optimization runs)
DROP POLICY IF EXISTS eval_opt_variation_progress_insert ON eval_opt_variation_progress;
CREATE POLICY eval_opt_variation_progress_insert ON eval_opt_variation_progress
    FOR INSERT
    WITH CHECK (run_id IN (
        SELECT id FROM eval_opt_runs
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Update: System can update variation progress (criteria_completed, status, etc.)
DROP POLICY IF EXISTS eval_opt_variation_progress_update ON eval_opt_variation_progress;
CREATE POLICY eval_opt_variation_progress_update ON eval_opt_variation_progress
    FOR UPDATE
    USING (run_id IN (
        SELECT id FROM eval_opt_runs
        WHERE ws_id IN (
            SELECT ws_id FROM ws_members
            WHERE user_id = auth.uid()
        )
    ));

-- Delete: Cascade delete with run (no direct delete policy needed)

-- ============================================================================
-- End of migration
-- ============================================================================
