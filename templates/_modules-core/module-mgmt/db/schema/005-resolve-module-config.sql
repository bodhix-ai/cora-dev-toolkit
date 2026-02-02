-- ============================================================================
-- CORA Module Registry - Config Resolution Function
-- Schema: 005-resolve-module-config.sql
-- Purpose: Cascading config resolution (sys → org → ws)
-- Created: Jan 2026 - WS Plugin Architecture Sprint 3
-- ============================================================================

-- ============================================================================
-- Function: resolve_module_config
-- Purpose: Resolve module configuration with cascading overrides
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_module_config(
    p_ws_id UUID,
    p_module_name VARCHAR(100)
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_org_id UUID;
    v_sys_config RECORD;
    v_org_config RECORD;
    v_ws_config RECORD;
    v_result JSONB;
    v_is_enabled BOOLEAN;
BEGIN
    -- Get workspace's org_id
    SELECT org_id INTO v_org_id
    FROM workspaces
    WHERE id = p_ws_id;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Workspace % not found', p_ws_id;
    END IF;
    
    -- Get system-level config
    SELECT * INTO v_sys_config
    FROM mgmt_cfg_sys_modules
    WHERE module_name = p_module_name
    AND deleted_at IS NULL;
    
    IF v_sys_config IS NULL THEN
        RAISE EXCEPTION 'Module % not found in system registry', p_module_name;
    END IF;
    
    -- Get org-level override (if exists)
    SELECT * INTO v_org_config
    FROM mgmt_cfg_org_modules
    WHERE org_id = v_org_id
    AND module_name = p_module_name;
    
    -- Get workspace-level override (if exists)
    SELECT * INTO v_ws_config
    FROM mgmt_cfg_ws_modules
    WHERE ws_id = p_ws_id
    AND module_name = p_module_name;
    
    -- Resolve is_enabled with cascade logic
    -- Start with system level
    v_is_enabled := v_sys_config.is_enabled;
    
    -- Apply org override (if exists and sys allows)
    IF v_org_config.is_enabled IS NOT NULL THEN
        -- If sys disabled, org cannot enable
        IF v_sys_config.is_enabled = FALSE THEN
            v_is_enabled := FALSE;
        ELSE
            v_is_enabled := v_org_config.is_enabled;
        END IF;
    END IF;
    
    -- Apply workspace override (if exists and org allows)
    IF v_ws_config.is_enabled IS NOT NULL THEN
        -- If org or sys disabled, workspace cannot enable
        IF v_sys_config.is_enabled = FALSE OR 
           (v_org_config.is_enabled IS NOT NULL AND v_org_config.is_enabled = FALSE) THEN
            v_is_enabled := FALSE;
        ELSE
            v_is_enabled := v_ws_config.is_enabled;
        END IF;
    END IF;
    
    -- Build result with merged config and feature_flags
    v_result := jsonb_build_object(
        'module_name', v_sys_config.module_name,
        'display_name', v_sys_config.display_name,
        'description', v_sys_config.description,
        'module_type', v_sys_config.module_type,
        'tier', v_sys_config.tier,
        'is_enabled', v_is_enabled,
        'is_installed', v_sys_config.is_installed,
        'version', v_sys_config.version,
        'min_compatible_version', v_sys_config.min_compatible_version,
        'dependencies', v_sys_config.dependencies,
        'nav_config', v_sys_config.nav_config,
        'required_permissions', v_sys_config.required_permissions,
        -- Merge config: sys → org → ws
        'config', 
            COALESCE(v_sys_config.config, '{}'::jsonb) ||
            COALESCE(v_org_config.config_overrides, '{}'::jsonb) ||
            COALESCE(v_ws_config.config_overrides, '{}'::jsonb),
        -- Merge feature_flags: sys → org → ws
        'feature_flags',
            COALESCE(v_sys_config.feature_flags, '{}'::jsonb) ||
            COALESCE(v_org_config.feature_flag_overrides, '{}'::jsonb) ||
            COALESCE(v_ws_config.feature_flag_overrides, '{}'::jsonb),
        -- Include override metadata
        'resolution_metadata', jsonb_build_object(
            'has_org_override', v_org_config.id IS NOT NULL,
            'has_ws_override', v_ws_config.id IS NOT NULL,
            'org_id', v_org_id,
            'ws_id', p_ws_id,
            'resolved_at', CURRENT_TIMESTAMP
        )
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- Function: resolve_org_module_config
-- Purpose: Resolve module configuration at org level (sys → org)
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_org_module_config(
    p_org_id UUID,
    p_module_name VARCHAR(100)
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_sys_config RECORD;
    v_org_config RECORD;
    v_result JSONB;
    v_is_enabled BOOLEAN;
BEGIN
    -- Get system-level config
    SELECT * INTO v_sys_config
    FROM mgmt_cfg_sys_modules
    WHERE module_name = p_module_name
    AND deleted_at IS NULL;
    
    IF v_sys_config IS NULL THEN
        RAISE EXCEPTION 'Module % not found in system registry', p_module_name;
    END IF;
    
    -- Get org-level override (if exists)
    SELECT * INTO v_org_config
    FROM mgmt_cfg_org_modules
    WHERE org_id = p_org_id
    AND module_name = p_module_name;
    
    -- Resolve is_enabled with cascade logic
    v_is_enabled := v_sys_config.is_enabled;
    
    -- Apply org override (if exists and sys allows)
    IF v_org_config.is_enabled IS NOT NULL THEN
        IF v_sys_config.is_enabled = FALSE THEN
            v_is_enabled := FALSE;
        ELSE
            v_is_enabled := v_org_config.is_enabled;
        END IF;
    END IF;
    
    -- Build result with merged config and feature_flags
    v_result := jsonb_build_object(
        'module_name', v_sys_config.module_name,
        'display_name', v_sys_config.display_name,
        'description', v_sys_config.description,
        'module_type', v_sys_config.module_type,
        'tier', v_sys_config.tier,
        'is_enabled', v_is_enabled,
        'is_installed', v_sys_config.is_installed,
        'version', v_sys_config.version,
        'min_compatible_version', v_sys_config.min_compatible_version,
        'dependencies', v_sys_config.dependencies,
        'nav_config', v_sys_config.nav_config,
        'required_permissions', v_sys_config.required_permissions,
        -- Merge config: sys → org
        'config', 
            COALESCE(v_sys_config.config, '{}'::jsonb) ||
            COALESCE(v_org_config.config_overrides, '{}'::jsonb),
        -- Merge feature_flags: sys → org
        'feature_flags',
            COALESCE(v_sys_config.feature_flags, '{}'::jsonb) ||
            COALESCE(v_org_config.feature_flag_overrides, '{}'::jsonb),
        -- Include override metadata
        'resolution_metadata', jsonb_build_object(
            'has_org_override', v_org_config.id IS NOT NULL,
            'org_id', p_org_id,
            'resolved_at', CURRENT_TIMESTAMP
        )
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- Function: resolve_all_modules_for_workspace
-- Purpose: Resolve all modules for a workspace
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_all_modules_for_workspace(p_ws_id UUID)
RETURNS SETOF JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_module RECORD;
BEGIN
    FOR v_module IN 
        SELECT module_name 
        FROM mgmt_cfg_sys_modules 
        WHERE deleted_at IS NULL
        ORDER BY tier, module_name
    LOOP
        RETURN NEXT resolve_module_config(p_ws_id, v_module.module_name);
    END LOOP;
    
    RETURN;
END;
$$;

-- ============================================================================
-- Function: resolve_all_modules_for_org
-- Purpose: Resolve all modules for an organization
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_all_modules_for_org(p_org_id UUID)
RETURNS SETOF JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_module RECORD;
BEGIN
    FOR v_module IN 
        SELECT module_name 
        FROM mgmt_cfg_sys_modules 
        WHERE deleted_at IS NULL
        ORDER BY tier, module_name
    LOOP
        RETURN NEXT resolve_org_module_config(p_org_id, v_module.module_name);
    END LOOP;
    
    RETURN;
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION resolve_module_config IS 'Resolve module configuration with cascading overrides (sys → org → ws) for a specific workspace';
COMMENT ON FUNCTION resolve_org_module_config IS 'Resolve module configuration with cascading overrides (sys → org) for an organization';
COMMENT ON FUNCTION resolve_all_modules_for_workspace IS 'Resolve all modules for a workspace, returning array of resolved configs';
COMMENT ON FUNCTION resolve_all_modules_for_org IS 'Resolve all modules for an organization, returning array of resolved configs';

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Example 1: Resolve single module for a workspace
-- SELECT resolve_module_config('ws-uuid-here', 'module-kb');

-- Example 2: Resolve all modules for a workspace
-- SELECT * FROM resolve_all_modules_for_workspace('ws-uuid-here');

-- Example 3: Resolve single module for an org
-- SELECT resolve_org_module_config('org-uuid-here', 'module-kb');

-- Example 4: Resolve all modules for an org
-- SELECT * FROM resolve_all_modules_for_org('org-uuid-here');

-- Example 5: Get only enabled modules for a workspace
-- SELECT * FROM resolve_all_modules_for_workspace('ws-uuid-here')
-- WHERE (resolve_all_modules_for_workspace->>'is_enabled')::boolean = true;