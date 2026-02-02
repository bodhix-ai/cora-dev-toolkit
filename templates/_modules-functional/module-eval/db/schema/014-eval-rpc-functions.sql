-- ============================================================================
-- Module: module-eval
-- Migration: 014-eval-rpc-functions
-- Description: RPC functions for access control and configuration resolution
-- ============================================================================

-- ============================================================================
-- Access Control Functions
-- ============================================================================

-- Check if user can manage eval config for an organization
CREATE OR REPLACE FUNCTION can_manage_eval_config(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_members
        WHERE org_id = p_org_id
        AND user_id = p_user_id
        AND org_role IN ('org_owner', 'org_admin')
    );
END;
$$;

COMMENT ON FUNCTION can_manage_eval_config IS 'Check if user has org admin access to manage eval config';

-- Check if user is the owner of an evaluation
CREATE OR REPLACE FUNCTION is_eval_owner(p_user_id UUID, p_eval_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM eval_doc_summary
        WHERE id = p_eval_id
        AND created_by = p_user_id
    );
END;
$$;

COMMENT ON FUNCTION is_eval_owner IS 'Check if user created the evaluation';

-- Check if user can view an evaluation (ownership + future sharing)
CREATE OR REPLACE FUNCTION can_view_eval(p_user_id UUID, p_eval_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check ownership (sharing to be added in future)
    RETURN is_eval_owner(p_user_id, p_eval_id);
    
    -- Future: Add sharing check
    -- OR EXISTS (
    --     SELECT 1 FROM eval_shares
    --     WHERE eval_id = p_eval_id
    --     AND shared_with_user_id = p_user_id
    --     AND can_view = true
    -- )
END;
$$;

COMMENT ON FUNCTION can_view_eval IS 'ADR-019c: Check if user can view evaluation (ownership + future sharing)';

-- Check if user can edit an evaluation (ownership + future edit shares)
CREATE OR REPLACE FUNCTION can_edit_eval(p_user_id UUID, p_eval_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check ownership (edit sharing to be added in future)
    RETURN is_eval_owner(p_user_id, p_eval_id);
    
    -- Future: Add edit sharing check
    -- OR EXISTS (
    --     SELECT 1 FROM eval_shares
    --     WHERE eval_id = p_eval_id
    --     AND shared_with_user_id = p_user_id
    --     AND can_edit = true
    -- )
END;
$$;

COMMENT ON FUNCTION can_edit_eval IS 'ADR-019c: Check if user can edit evaluation (ownership + future edit shares)';

-- ============================================================================
-- Configuration Resolution Functions
-- ============================================================================

-- Get effective eval config with org overrides
CREATE OR REPLACE FUNCTION get_eval_config(p_org_id UUID)
RETURNS TABLE (
    categorical_mode TEXT,
    show_numerical_score BOOLEAN,
    ai_config_delegated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sys_config RECORD;
    v_org_config RECORD;
BEGIN
    -- Get system defaults
    SELECT * INTO v_sys_config FROM eval_sys_config LIMIT 1;
    
    -- Get org overrides
    SELECT * INTO v_org_config FROM eval_org_config WHERE org_id = p_org_id;
    
    RETURN QUERY SELECT
        COALESCE(v_org_config.categorical_mode, v_sys_config.categorical_mode),
        COALESCE(v_org_config.show_numerical_score, v_sys_config.show_numerical_score),
        COALESCE(v_org_config.ai_config_delegated, false);
END;
$$;

COMMENT ON FUNCTION get_eval_config IS 'Resolve evaluation config with org overrides applied';

-- Get effective status options for an organization
CREATE OR REPLACE FUNCTION get_effective_status_options(p_org_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    color TEXT,
    score_value DECIMAL(5,2),
    order_index INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config RECORD;
    v_has_org_options BOOLEAN;
BEGIN
    -- Get effective config to determine mode
    SELECT * INTO v_config FROM get_eval_config(p_org_id);
    
    -- Check if org has custom status options
    SELECT EXISTS (
        SELECT 1 FROM eval_org_status_options 
        WHERE org_id = p_org_id AND is_active = true
    ) INTO v_has_org_options;
    
    IF v_has_org_options THEN
        RETURN QUERY
            SELECT eso.id, eso.name, eso.color, eso.score_value, eso.order_index
            FROM eval_org_status_options eso
            WHERE eso.org_id = p_org_id AND eso.is_active = true
            ORDER BY eso.order_index;
    ELSE
        RETURN QUERY
            SELECT sso.id, sso.name, sso.color, sso.score_value, sso.order_index
            FROM eval_sys_status_options sso
            WHERE sso.mode IN (v_config.categorical_mode, 'both')
            ORDER BY sso.order_index;
    END IF;
END;
$$;

COMMENT ON FUNCTION get_effective_status_options IS 'Get status options for org (org options override sys defaults)';

-- Get effective prompt config for an organization and prompt type
CREATE OR REPLACE FUNCTION get_eval_prompt_config(p_org_id UUID, p_prompt_type TEXT)
RETURNS TABLE (
    ai_provider_id UUID,
    ai_model_id UUID,
    system_prompt TEXT,
    user_prompt_template TEXT,
    temperature DECIMAL(3,2),
    max_tokens INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_config RECORD;
    v_org_prompt RECORD;
    v_sys_prompt RECORD;
BEGIN
    -- Check if org has delegation enabled
    SELECT ai_config_delegated INTO v_org_config 
    FROM eval_org_config WHERE org_id = p_org_id;
    
    IF v_org_config.ai_config_delegated THEN
        -- Try org-level prompt
        SELECT * INTO v_org_prompt 
        FROM eval_org_prompt_config 
        WHERE org_id = p_org_id AND prompt_type = p_prompt_type;
        
        IF v_org_prompt.id IS NOT NULL THEN
            -- Get sys prompt for fallback values
            SELECT * INTO v_sys_prompt 
            FROM eval_sys_prompt_config WHERE prompt_type = p_prompt_type;
            
            RETURN QUERY SELECT
                COALESCE(v_org_prompt.ai_provider_id, v_sys_prompt.ai_provider_id),
                COALESCE(v_org_prompt.ai_model_id, v_sys_prompt.ai_model_id),
                COALESCE(v_org_prompt.system_prompt, v_sys_prompt.system_prompt),
                COALESCE(v_org_prompt.user_prompt_template, v_sys_prompt.user_prompt_template),
                COALESCE(v_org_prompt.temperature, v_sys_prompt.temperature),
                COALESCE(v_org_prompt.max_tokens, v_sys_prompt.max_tokens);
            RETURN;
        END IF;
    END IF;
    
    -- Fall back to system prompt
    RETURN QUERY
        SELECT 
            spc.ai_provider_id,
            spc.ai_model_id,
            spc.system_prompt,
            spc.user_prompt_template,
            spc.temperature,
            spc.max_tokens
        FROM eval_sys_prompt_config spc
        WHERE spc.prompt_type = p_prompt_type;
END;
$$;

COMMENT ON FUNCTION get_eval_prompt_config IS 'Resolve prompt config with delegation check';

-- ============================================================================
-- End of migration
-- ============================================================================
