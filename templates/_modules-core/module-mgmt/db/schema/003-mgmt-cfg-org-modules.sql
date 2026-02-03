-- ============================================================================
-- CORA Module Registry - Organization-Level Configuration
-- Schema: 003-mgmt-cfg-org-modules.sql
-- Purpose: Org-level overrides for module configuration
-- Created: Jan 2026 - WS Plugin Architecture Sprint 3
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: mgmt_cfg_org_modules
-- Purpose: Organization-level module configuration overrides
-- ============================================================================

CREATE TABLE IF NOT EXISTS mgmt_cfg_org_modules (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationships
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL REFERENCES mgmt_cfg_sys_modules(module_name) ON DELETE CASCADE,
    
    -- Module Status Override
    -- NULL = inherit from system, FALSE = explicitly disabled, TRUE = explicitly enabled
    is_enabled BOOLEAN,
    
    -- Configuration Overrides
    -- These JSONB fields merge with system-level config
    -- Only specified keys override system defaults
    config_overrides JSONB DEFAULT '{}'::jsonb,
    feature_flag_overrides JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,  -- User who created the override
    updated_by UUID,  -- User who last updated the override
    
    -- Constraints
    CONSTRAINT unique_org_module UNIQUE (org_id, module_name)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for org lookups
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_org_modules_org 
    ON mgmt_cfg_org_modules(org_id);

-- Index for module lookups
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_org_modules_module 
    ON mgmt_cfg_org_modules(module_name);

-- Index for enabled modules per org
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_org_modules_enabled 
    ON mgmt_cfg_org_modules(org_id, is_enabled) 
    WHERE is_enabled = TRUE;

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_mgmt_cfg_org_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mgmt_cfg_org_modules_timestamp 
    ON mgmt_cfg_org_modules;

CREATE TRIGGER trigger_update_mgmt_cfg_org_modules_timestamp 
    BEFORE UPDATE ON mgmt_cfg_org_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_mgmt_cfg_org_modules_updated_at();

-- ============================================================================
-- Validation Trigger - Prevent Enabling Disabled System Modules
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_org_module_enable()
RETURNS TRIGGER AS $$
DECLARE
    v_sys_enabled BOOLEAN;
BEGIN
    -- Only validate if trying to enable (is_enabled = TRUE)
    IF NEW.is_enabled = TRUE THEN
        -- Check if system has this module enabled
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_org_module_enable 
    ON mgmt_cfg_org_modules;

CREATE TRIGGER trigger_validate_org_module_enable
    BEFORE INSERT OR UPDATE ON mgmt_cfg_org_modules
    FOR EACH ROW
    EXECUTE FUNCTION validate_org_module_enable();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE mgmt_cfg_org_modules ENABLE ROW LEVEL SECURITY;

-- Org admins can read their org's module config
CREATE POLICY org_admin_read_own_module_config ON mgmt_cfg_org_modules
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM org_members 
            WHERE org_id = mgmt_cfg_org_modules.org_id 
            AND org_role IN ('org_owner', 'org_admin')
        )
    );

-- Org admins can update their org's module config
CREATE POLICY org_admin_update_own_module_config ON mgmt_cfg_org_modules
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM org_members 
            WHERE org_id = mgmt_cfg_org_modules.org_id 
            AND org_role IN ('org_owner', 'org_admin')
        )
    );

-- Org admins can insert module config for their org
CREATE POLICY org_admin_insert_own_module_config ON mgmt_cfg_org_modules
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM org_members 
            WHERE org_id = mgmt_cfg_org_modules.org_id 
            AND org_role IN ('org_owner', 'org_admin')
        )
    );

-- System admins can manage all org module configs
CREATE POLICY sys_admin_manage_all_org_module_config ON mgmt_cfg_org_modules
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

COMMENT ON TABLE mgmt_cfg_org_modules IS 'Organization-level overrides for module configuration';
COMMENT ON COLUMN mgmt_cfg_org_modules.is_enabled IS 'NULL = inherit from system, FALSE = disabled, TRUE = enabled';
COMMENT ON COLUMN mgmt_cfg_org_modules.config_overrides IS 'JSONB config that merges with system config (overrides specified keys)';
COMMENT ON COLUMN mgmt_cfg_org_modules.feature_flag_overrides IS 'JSONB feature flags that merge with system flags (overrides specified keys)';
COMMENT ON CONSTRAINT unique_org_module ON mgmt_cfg_org_modules IS 'One config row per org per module';
