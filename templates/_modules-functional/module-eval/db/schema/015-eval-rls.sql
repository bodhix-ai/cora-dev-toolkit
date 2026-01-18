-- ============================================================================
-- Module: module-eval
-- Migration: 015-eval-rls
-- Description: Row Level Security policies for all eval tables
-- ============================================================================

-- ============================================================================
-- System Configuration Tables - Sys Admin Only
-- ============================================================================

-- eval_sys_config: Only sys_admin can read/write
ALTER TABLE eval_sys_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_sys_config_select ON eval_sys_config;
CREATE POLICY eval_sys_config_select ON eval_sys_config
    FOR SELECT USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

DROP POLICY IF EXISTS eval_sys_config_update ON eval_sys_config;
CREATE POLICY eval_sys_config_update ON eval_sys_config
    FOR UPDATE USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

-- eval_sys_prompt_config: Only sys_admin
ALTER TABLE eval_sys_prompt_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_sys_prompt_config_select ON eval_sys_prompt_config;
CREATE POLICY eval_sys_prompt_config_select ON eval_sys_prompt_config
    FOR SELECT USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

DROP POLICY IF EXISTS eval_sys_prompt_config_all ON eval_sys_prompt_config;
CREATE POLICY eval_sys_prompt_config_all ON eval_sys_prompt_config
    FOR ALL USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

-- eval_sys_status_options: Sys admin write, all authenticated read
ALTER TABLE eval_sys_status_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_sys_status_options_select ON eval_sys_status_options;
CREATE POLICY eval_sys_status_options_select ON eval_sys_status_options
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS eval_sys_status_options_all ON eval_sys_status_options;
CREATE POLICY eval_sys_status_options_all ON eval_sys_status_options
    FOR ALL USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

-- ============================================================================
-- Organization Configuration Tables
-- ============================================================================

-- eval_org_config: Sys admin can read all, org admin can read/write own
ALTER TABLE eval_org_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_org_config_sys_admin ON eval_org_config;
CREATE POLICY eval_org_config_sys_admin ON eval_org_config
    FOR ALL USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

DROP POLICY IF EXISTS eval_org_config_org_admin_select ON eval_org_config;
CREATE POLICY eval_org_config_org_admin_select ON eval_org_config
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_org_config.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
        )
    );

DROP POLICY IF EXISTS eval_org_config_org_admin_update ON eval_org_config;
CREATE POLICY eval_org_config_org_admin_update ON eval_org_config
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_org_config.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
        )
    );

-- eval_org_prompt_config: Delegation check for org admin
ALTER TABLE eval_org_prompt_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_org_prompt_config_sys_admin ON eval_org_prompt_config;
CREATE POLICY eval_org_prompt_config_sys_admin ON eval_org_prompt_config
    FOR ALL USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

DROP POLICY IF EXISTS eval_org_prompt_config_delegated ON eval_org_prompt_config;
CREATE POLICY eval_org_prompt_config_delegated ON eval_org_prompt_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM eval_org_config 
            WHERE eval_org_config.org_id = eval_org_prompt_config.org_id
            AND eval_org_config.ai_config_delegated = true
        )
        AND EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_org_prompt_config.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
        )
    );

-- eval_org_status_options: Org admin can manage
ALTER TABLE eval_org_status_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_org_status_options_sys_admin ON eval_org_status_options;
CREATE POLICY eval_org_status_options_sys_admin ON eval_org_status_options
    FOR ALL USING (
        auth.jwt() ->> 'sys_role' IN ('sys_owner', 'sys_admin')
    );

DROP POLICY IF EXISTS eval_org_status_options_select ON eval_org_status_options;
CREATE POLICY eval_org_status_options_select ON eval_org_status_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_org_status_options.org_id
            AND org_members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS eval_org_status_options_all ON eval_org_status_options;
CREATE POLICY eval_org_status_options_all ON eval_org_status_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_org_status_options.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
        )
    );

-- ============================================================================
-- Document Types & Criteria Tables
-- ============================================================================

-- eval_doc_types: Org members can read, org admin can write
ALTER TABLE eval_doc_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_doc_types_select ON eval_doc_types;
CREATE POLICY eval_doc_types_select ON eval_doc_types
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_doc_types.org_id
            AND org_members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS eval_doc_types_all ON eval_doc_types;
CREATE POLICY eval_doc_types_all ON eval_doc_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = eval_doc_types.org_id
            AND org_members.user_id = auth.uid()
            AND org_members.org_role IN ('org_owner', 'org_admin')
        )
    );

-- eval_criteria_sets: Org members can read through doc type, org admin can write
ALTER TABLE eval_criteria_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_criteria_sets_select ON eval_criteria_sets;
CREATE POLICY eval_criteria_sets_select ON eval_criteria_sets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM eval_doc_types dt
            JOIN org_members om ON om.org_id = dt.org_id
            WHERE dt.id = eval_criteria_sets.doc_type_id
            AND om.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS eval_criteria_sets_all ON eval_criteria_sets;
CREATE POLICY eval_criteria_sets_all ON eval_criteria_sets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM eval_doc_types dt
            JOIN org_members om ON om.org_id = dt.org_id
            WHERE dt.id = eval_criteria_sets.doc_type_id
            AND om.user_id = auth.uid()
            AND om.org_role IN ('org_owner', 'org_admin')
        )
    );

-- eval_criteria_items: Same as criteria sets
ALTER TABLE eval_criteria_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_criteria_items_select ON eval_criteria_items;
CREATE POLICY eval_criteria_items_select ON eval_criteria_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM eval_criteria_sets cs
            JOIN eval_doc_types dt ON dt.id = cs.doc_type_id
            JOIN org_members om ON om.org_id = dt.org_id
            WHERE cs.id = eval_criteria_items.criteria_set_id
            AND om.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS eval_criteria_items_all ON eval_criteria_items;
CREATE POLICY eval_criteria_items_all ON eval_criteria_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM eval_criteria_sets cs
            JOIN eval_doc_types dt ON dt.id = cs.doc_type_id
            JOIN org_members om ON om.org_id = dt.org_id
            WHERE cs.id = eval_criteria_items.criteria_set_id
            AND om.user_id = auth.uid()
            AND om.org_role IN ('org_owner', 'org_admin')
        )
    );

-- ============================================================================
-- Evaluation Results Tables
-- ============================================================================

-- eval_doc_summaries: Workspace members can access
ALTER TABLE eval_doc_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_doc_summaries_select ON eval_doc_summaries;
CREATE POLICY eval_doc_summaries_select ON eval_doc_summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ws_members 
            WHERE ws_members.workspace_id = eval_doc_summaries.workspace_id
            AND ws_members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS eval_doc_summaries_insert ON eval_doc_summaries;
CREATE POLICY eval_doc_summaries_insert ON eval_doc_summaries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ws_members 
            WHERE ws_members.workspace_id = eval_doc_summaries.workspace_id
            AND ws_members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS eval_doc_summaries_update ON eval_doc_summaries;
CREATE POLICY eval_doc_summaries_update ON eval_doc_summaries
    FOR UPDATE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM ws_members 
            WHERE ws_members.workspace_id = eval_doc_summaries.workspace_id
            AND ws_members.user_id = auth.uid()
            AND ws_members.ws_role IN ('ws_owner', 'ws_admin')
        )
    );

DROP POLICY IF EXISTS eval_doc_summaries_delete ON eval_doc_summaries;
CREATE POLICY eval_doc_summaries_delete ON eval_doc_summaries
    FOR DELETE USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM ws_members 
            WHERE ws_members.workspace_id = eval_doc_summaries.workspace_id
            AND ws_members.user_id = auth.uid()
            AND ws_members.ws_role IN ('ws_owner', 'ws_admin')
        )
    );

-- eval_doc_sets: Access through eval_doc_summaries
ALTER TABLE eval_doc_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_doc_sets_select ON eval_doc_sets;
CREATE POLICY eval_doc_sets_select ON eval_doc_sets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM eval_doc_summaries eds
            JOIN ws_members wm ON wm.workspace_id = eds.workspace_id
            WHERE eds.id = eval_doc_sets.eval_summary_id
            AND wm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS eval_doc_sets_all ON eval_doc_sets;
CREATE POLICY eval_doc_sets_all ON eval_doc_sets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM eval_doc_summaries eds
            JOIN ws_members wm ON wm.workspace_id = eds.workspace_id
            WHERE eds.id = eval_doc_sets.eval_summary_id
            AND wm.user_id = auth.uid()
        )
    );

-- eval_criteria_results: Access through eval_doc_summaries
ALTER TABLE eval_criteria_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_criteria_results_select ON eval_criteria_results;
CREATE POLICY eval_criteria_results_select ON eval_criteria_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM eval_doc_summaries eds
            JOIN ws_members wm ON wm.workspace_id = eds.workspace_id
            WHERE eds.id = eval_criteria_results.eval_summary_id
            AND wm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS eval_criteria_results_all ON eval_criteria_results;
CREATE POLICY eval_criteria_results_all ON eval_criteria_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM eval_doc_summaries eds
            JOIN ws_members wm ON wm.workspace_id = eds.workspace_id
            WHERE eds.id = eval_criteria_results.eval_summary_id
            AND wm.user_id = auth.uid()
        )
    );

-- eval_result_edits: Access through criteria result and eval_doc_summaries
ALTER TABLE eval_result_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eval_result_edits_select ON eval_result_edits;
CREATE POLICY eval_result_edits_select ON eval_result_edits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM eval_criteria_results ecr
            JOIN eval_doc_summaries eds ON eds.id = ecr.eval_summary_id
            JOIN ws_members wm ON wm.workspace_id = eds.workspace_id
            WHERE ecr.id = eval_result_edits.criteria_result_id
            AND wm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS eval_result_edits_all ON eval_result_edits;
CREATE POLICY eval_result_edits_all ON eval_result_edits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM eval_criteria_results ecr
            JOIN eval_doc_summaries eds ON eds.id = ecr.eval_summary_id
            JOIN ws_members wm ON wm.workspace_id = eds.workspace_id
            WHERE ecr.id = eval_result_edits.criteria_result_id
            AND wm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- End of migration
-- ============================================================================
