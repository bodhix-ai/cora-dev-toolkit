-- ============================================================================
-- Module: module-eval-optimizer
-- Migration: 005-eval-opt-rls
-- Description: Row Level Security policies for eval optimizer tables
-- ============================================================================

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE eval_opt_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_proj_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_test_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_doc_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_doc_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_truth_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_run_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_opt_prompt_deployments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROJECTS
-- ============================================================================

-- Select: Users can see projects in orgs they belong to
DROP POLICY IF EXISTS eval_opt_projects_select ON eval_opt_projects;
CREATE POLICY eval_opt_projects_select ON eval_opt_projects
    FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM org_members
        WHERE user_id = auth.uid()
    ));

-- Insert: Users can create projects in orgs they belong to
DROP POLICY IF EXISTS eval_opt_projects_insert ON eval_opt_projects;
CREATE POLICY eval_opt_projects_insert ON eval_opt_projects
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members
        WHERE user_id = auth.uid()
    ));

-- Update: Project owners and admins can update
DROP POLICY IF EXISTS eval_opt_projects_update ON eval_opt_projects;
CREATE POLICY eval_opt_projects_update ON eval_opt_projects
    FOR UPDATE
    USING (id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Delete: Only project owners can delete
DROP POLICY IF EXISTS eval_opt_projects_delete ON eval_opt_projects;
CREATE POLICY eval_opt_projects_delete ON eval_opt_projects
    FOR DELETE
    USING (id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid() AND role = 'owner'
    ));

-- ============================================================================
-- PROJECT MEMBERS
-- ============================================================================

-- Select: Users can see members of projects they belong to
DROP POLICY IF EXISTS eval_opt_proj_members_select ON eval_opt_proj_members;
CREATE POLICY eval_opt_proj_members_select ON eval_opt_proj_members
    FOR SELECT
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Insert: Project owners and admins can add members
DROP POLICY IF EXISTS eval_opt_proj_members_insert ON eval_opt_proj_members;
CREATE POLICY eval_opt_proj_members_insert ON eval_opt_proj_members
    FOR INSERT
    WITH CHECK (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Update: Project owners and admins can update members
DROP POLICY IF EXISTS eval_opt_proj_members_update ON eval_opt_proj_members;
CREATE POLICY eval_opt_proj_members_update ON eval_opt_proj_members
    FOR UPDATE
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Delete: Project owners and admins can remove members
DROP POLICY IF EXISTS eval_opt_proj_members_delete ON eval_opt_proj_members;
CREATE POLICY eval_opt_proj_members_delete ON eval_opt_proj_members
    FOR DELETE
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- ============================================================================
-- TEST ORGS
-- ============================================================================

-- Select: Users can see test orgs for projects they belong to
DROP POLICY IF EXISTS eval_opt_test_orgs_select ON eval_opt_test_orgs;
CREATE POLICY eval_opt_test_orgs_select ON eval_opt_test_orgs
    FOR SELECT
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Insert: Project members can create test orgs
DROP POLICY IF EXISTS eval_opt_test_orgs_insert ON eval_opt_test_orgs;
CREATE POLICY eval_opt_test_orgs_insert ON eval_opt_test_orgs
    FOR INSERT
    WITH CHECK (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Delete: Project owners and admins can delete test orgs
DROP POLICY IF EXISTS eval_opt_test_orgs_delete ON eval_opt_test_orgs;
CREATE POLICY eval_opt_test_orgs_delete ON eval_opt_test_orgs
    FOR DELETE
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- ============================================================================
-- DOCUMENT GROUPS
-- ============================================================================

-- Select: Users can see document groups for projects they belong to
DROP POLICY IF EXISTS eval_opt_doc_groups_select ON eval_opt_doc_groups;
CREATE POLICY eval_opt_doc_groups_select ON eval_opt_doc_groups
    FOR SELECT
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Insert: Project members can create document groups
DROP POLICY IF EXISTS eval_opt_doc_groups_insert ON eval_opt_doc_groups;
CREATE POLICY eval_opt_doc_groups_insert ON eval_opt_doc_groups
    FOR INSERT
    WITH CHECK (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Update: Project members can update document groups
DROP POLICY IF EXISTS eval_opt_doc_groups_update ON eval_opt_doc_groups;
CREATE POLICY eval_opt_doc_groups_update ON eval_opt_doc_groups
    FOR UPDATE
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Delete: Project owners and admins can delete document groups
DROP POLICY IF EXISTS eval_opt_doc_groups_delete ON eval_opt_doc_groups;
CREATE POLICY eval_opt_doc_groups_delete ON eval_opt_doc_groups
    FOR DELETE
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- ============================================================================
-- DOCUMENT GROUP MEMBERS
-- ============================================================================

-- Select: Users can see document group members for their projects
DROP POLICY IF EXISTS eval_opt_doc_group_members_select ON eval_opt_doc_group_members;
CREATE POLICY eval_opt_doc_group_members_select ON eval_opt_doc_group_members
    FOR SELECT
    USING (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid()
        )
    ));

-- Insert: Project members can add documents to groups
DROP POLICY IF EXISTS eval_opt_doc_group_members_insert ON eval_opt_doc_group_members;
CREATE POLICY eval_opt_doc_group_members_insert ON eval_opt_doc_group_members
    FOR INSERT
    WITH CHECK (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid()
        )
    ));

-- Delete: Project members can remove documents from groups
DROP POLICY IF EXISTS eval_opt_doc_group_members_delete ON eval_opt_doc_group_members;
CREATE POLICY eval_opt_doc_group_members_delete ON eval_opt_doc_group_members
    FOR DELETE
    USING (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid()
        )
    ));

-- ============================================================================
-- TRUTH KEYS
-- ============================================================================

-- Select: Users can see truth keys for their projects
DROP POLICY IF EXISTS eval_opt_truth_keys_select ON eval_opt_truth_keys;
CREATE POLICY eval_opt_truth_keys_select ON eval_opt_truth_keys
    FOR SELECT
    USING (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid()
        )
    ));

-- Insert: Project members can create truth keys
DROP POLICY IF EXISTS eval_opt_truth_keys_insert ON eval_opt_truth_keys;
CREATE POLICY eval_opt_truth_keys_insert ON eval_opt_truth_keys
    FOR INSERT
    WITH CHECK (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid()
        )
    ));

-- Update: Project members can update truth keys
DROP POLICY IF EXISTS eval_opt_truth_keys_update ON eval_opt_truth_keys;
CREATE POLICY eval_opt_truth_keys_update ON eval_opt_truth_keys
    FOR UPDATE
    USING (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid()
        )
    ));

-- Delete: Project owners and admins can delete truth keys
DROP POLICY IF EXISTS eval_opt_truth_keys_delete ON eval_opt_truth_keys;
CREATE POLICY eval_opt_truth_keys_delete ON eval_opt_truth_keys
    FOR DELETE
    USING (group_id IN (
        SELECT id FROM eval_opt_doc_groups
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    ));

-- ============================================================================
-- RUNS
-- ============================================================================

-- Select: Users can see runs for their projects
DROP POLICY IF EXISTS eval_opt_runs_select ON eval_opt_runs;
CREATE POLICY eval_opt_runs_select ON eval_opt_runs
    FOR SELECT
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Insert: Project members can create runs
DROP POLICY IF EXISTS eval_opt_runs_insert ON eval_opt_runs;
CREATE POLICY eval_opt_runs_insert ON eval_opt_runs
    FOR INSERT
    WITH CHECK (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Update: System can update run status (for background processing)
DROP POLICY IF EXISTS eval_opt_runs_update ON eval_opt_runs;
CREATE POLICY eval_opt_runs_update ON eval_opt_runs
    FOR UPDATE
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Delete: Project owners and admins can delete runs
DROP POLICY IF EXISTS eval_opt_runs_delete ON eval_opt_runs;
CREATE POLICY eval_opt_runs_delete ON eval_opt_runs
    FOR DELETE
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- ============================================================================
-- RUN RESULTS
-- ============================================================================

-- Select: Users can see run results for their projects
DROP POLICY IF EXISTS eval_opt_run_results_select ON eval_opt_run_results;
CREATE POLICY eval_opt_run_results_select ON eval_opt_run_results
    FOR SELECT
    USING (run_id IN (
        SELECT id FROM eval_opt_runs
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid()
        )
    ));

-- Insert: System can create run results (during optimization runs)
DROP POLICY IF EXISTS eval_opt_run_results_insert ON eval_opt_run_results;
CREATE POLICY eval_opt_run_results_insert ON eval_opt_run_results
    FOR INSERT
    WITH CHECK (run_id IN (
        SELECT id FROM eval_opt_runs
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid()
        )
    ));

-- Delete: Cascade delete with run (no direct delete policy needed)

-- ============================================================================
-- PROMPT VERSIONS
-- ============================================================================

-- Prompt Versions: Users can see versions for their projects
DROP POLICY IF EXISTS eval_opt_prompt_versions_select ON eval_opt_prompt_versions;
CREATE POLICY eval_opt_prompt_versions_select ON eval_opt_prompt_versions
    FOR SELECT
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Prompt Versions: Project members can create versions
DROP POLICY IF EXISTS eval_opt_prompt_versions_insert ON eval_opt_prompt_versions;
CREATE POLICY eval_opt_prompt_versions_insert ON eval_opt_prompt_versions
    FOR INSERT
    WITH CHECK (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Prompt Versions: Project members can update versions
DROP POLICY IF EXISTS eval_opt_prompt_versions_update ON eval_opt_prompt_versions;
CREATE POLICY eval_opt_prompt_versions_update ON eval_opt_prompt_versions
    FOR UPDATE
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid()
    ));

-- Prompt Versions: Project owners and admins can delete versions
DROP POLICY IF EXISTS eval_opt_prompt_versions_delete ON eval_opt_prompt_versions;
CREATE POLICY eval_opt_prompt_versions_delete ON eval_opt_prompt_versions
    FOR DELETE
    USING (proj_id IN (
        SELECT proj_id FROM eval_opt_proj_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Deployments: Users can see deployments for their prompt versions
DROP POLICY IF EXISTS eval_opt_prompt_deployments_select ON eval_opt_prompt_deployments;
CREATE POLICY eval_opt_prompt_deployments_select ON eval_opt_prompt_deployments
    FOR SELECT
    USING (prompt_version_id IN (
        SELECT id FROM eval_opt_prompt_versions
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid()
        )
    ));

-- Deployments: Project owners and admins can create deployments
DROP POLICY IF EXISTS eval_opt_prompt_deployments_insert ON eval_opt_prompt_deployments;
CREATE POLICY eval_opt_prompt_deployments_insert ON eval_opt_prompt_deployments
    FOR INSERT
    WITH CHECK (prompt_version_id IN (
        SELECT id FROM eval_opt_prompt_versions
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    ));

-- Deployments: Project owners and admins can update deployments (for rollbacks)
DROP POLICY IF EXISTS eval_opt_prompt_deployments_update ON eval_opt_prompt_deployments;
CREATE POLICY eval_opt_prompt_deployments_update ON eval_opt_prompt_deployments
    FOR UPDATE
    USING (prompt_version_id IN (
        SELECT id FROM eval_opt_prompt_versions
        WHERE proj_id IN (
            SELECT proj_id FROM eval_opt_proj_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    ));

-- ============================================================================
-- End of migration
-- ============================================================================
