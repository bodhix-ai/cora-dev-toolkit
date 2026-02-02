-- ============================================================================
-- CORA Module Registry - Workspace-Level Configuration
-- Schema: 004-mgmt-cfg-ws-modules.sql
-- Purpose: Workspace-level overrides for module configuration
-- Created: Jan 2026 - WS Plugin Architecture Sprint 3
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: mgmt_cfg_ws_modules
-- Purpose: Workspace-level module configuration overrides
-- ============================================================================

CREATE TABLE IF NOT EXISTS mgmt_cfg_ws_modules (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    ws_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL REFERENCES mgmt_cfg_sys_modules(module_name) ON DELETE CASCADE,
    
    -- Module Status Override
    -- NULL = inherit from org/system, FALSE = explicitly disabled, TRUE = explicitly enabled
    is_enabled BOOLEAN,
    
    -- Configuration Overrides
    -- These JSONB fields merge with org-level and system-level config
    -- Only specified keys override parent defaults
    config_overrides JSONB DEFAULT '{}'::jsonb,
    feature_flag_overrides JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,  -- User who created the override
    updated_by UUID,  -- User who last updated the override
    
    -- Constraints
    CONSTRAINT unique_ws_module UNIQUE (ws_id, module_name)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for workspace lookups
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_ws_modules_ws 
    ON mgmt_cfg_ws_modules(ws_id);

-- Index for module lookups
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_ws_modules_module 
    ON mgmt_cfg_ws_modules(module_name);

-- Index for enabled modules per workspace
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_ws_modules_enabled 
    ON mgmt_cfg_ws_modules(ws_id, is_enabled) 
    WHERE is_enabled = TRUE;

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_mgmt_cfg_ws_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mgmt_cfg_ws_modules_timestamp 
    ON mgmt_cfg_ws_modules;

CREATE TRIGGER trigger_update_mgmt_cfg_ws_modules_timestamp 
    BEFORE UPDATE ON mgmt_cfg_ws_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_mgmt_cfg_ws_modules_updated_at();

-- ============================================================================
-- Validation Trigger - Prevent Enabling Disabled Modules
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_ws_module_enable()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
    v_sys_enabled BOOLEAN;
    v_org_enabled BOOLEAN;
BEGIN
    -- Only validate if trying to enable (is_enabled = TRUE)
    IF NEW.is_enabled = TRUE THEN
        -- Get workspace's org_id
        SELECT org_id INTO v_org_id
        FROM workspaces
        WHERE id = NEW.ws_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Workspace % not found', NEW.ws_id;
        END IF;
        
        -- Check system-level enablement
        SELECT is_enabled INTO v_sys_enabled
        FROM mgmt_cfg_sys_modules
        WHERE module_name = NEW.module_name
        AND deleted_at IS NULL;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Module % not found in system registry', NEW.module_name;
        END IF;
        
        IF v_sys_enabled = FALSE THEN
            RAISE EXCEPTION 'Cannot enable module % - system has it disabled', NEW.module_name;
        END IF;
        
        -- Check org-level enablement (if org override exists)
        SELECT is_enabled INTO v_org_enabled
        FROM mgmt_cfg_org_modules
        WHERE org_id = v_org_id
        AND module_name = NEW.module_name;
        
        IF FOUND AND v_org_enabled = FALSE THEN
            RAISE EXCEPTION 'Cannot enable module % - organization has it disabled', NEW.module_name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_ws_module_enable 
    ON mgmt_cfg_ws_modules;

CREATE TRIGGER trigger_validate_ws_module_enable
    BEFORE INSERT OR UPDATE ON mgmt_cfg_ws_modules
    FOR EACH ROW
    EXECUTE FUNCTION validate_ws_module_enable();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE mgmt_cfg_ws_modules ENABLE ROW LEVEL SECURITY;

-- Workspace members can read their workspace's module config
CREATE POLICY ws_member_read_own_module_config ON mgmt_cfg_ws_modules
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM ws_members 
            WHERE ws_id = mgmt_cfg_ws_modules.ws_id
        )
    );

-- Workspace admins can update their workspace's module config
CREATE POLICY ws_admin_update_own_module_config ON mgmt_cfg_ws_modules
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM ws_members 
            WHERE ws_id = mgmt_cfg_ws_modules.ws_id 
            AND ws_role IN ('ws_owner', 'ws_admin')
        )
    );

-- Workspace admins can insert module config for their workspace
CREATE POLICY ws_admin_insert_own_module_config ON mgmt_cfg_ws_modules
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM ws_members 
            WHERE ws_id = mgmt_cfg_ws_modules.ws_id 
            AND ws_role IN ('ws_owner', 'ws_admin')
        )
    );

-- Org admins can manage module config for workspaces in their org
CREATE POLICY org_admin_manage_ws_module_config ON mgmt_cfg_ws_modules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w
            JOIN org_members om ON om.org_id = w.org_id
            WHERE w.id = mgmt_cfg_ws_modules.ws_id
            AND om.user_id = auth.uid()
            AND om.org_role IN ('org_owner', 'org_admin')
        )
    );

-- System admins can manage all workspace module configs
CREATE POLICY sys_admin_manage_all_ws_module_config ON mgmt_cfg_ws_modules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND sys_role IN ('sys_owner', 'sys_admin')
        )
    );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE mgmt_cfg_ws_modules IS 'Workspace-level overrides for module configuration';
COMMENT ON COLUMN mgmt_cfg_ws_modules.is_enabled IS 'NULL = inherit from org/system, FALSE = disabled, TRUE = enabled';
COMMENT ON COLUMN mgmt_cfg_ws_modules.config_overrides IS 'JSONB config that merges with org and system config (overrides specified keys)';
COMMENT ON COLUMN mgmt_cfg_ws_modules.feature_flag_overrides IS 'JSONB feature flags that merge with org and system flags (overrides specified keys)';
COMMENT ON CONSTRAINT unique_ws_module ON mgmt_cfg_ws_modules IS 'One config row per workspace per module';