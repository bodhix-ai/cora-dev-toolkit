-- =============================================
-- MODULE-WS: Organization Settings Table
-- =============================================
-- Purpose: Store organization-specific workspace policies and settings
-- Source: Created for CORA toolkit Jan 2026

-- =============================================
-- TABLE: ws_org_settings
-- =============================================

CREATE TABLE IF NOT EXISTS ws_org_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    
    -- Workspace creation policies
    allow_user_creation BOOLEAN NOT NULL DEFAULT true,
    require_approval BOOLEAN NOT NULL DEFAULT false,
    max_workspaces_per_user INTEGER NOT NULL DEFAULT 10,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT ws_org_settings_org_id_unique UNIQUE(org_id),
    CONSTRAINT ws_org_settings_max_workspaces_check CHECK (max_workspaces_per_user >= 1 AND max_workspaces_per_user <= 100)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ws_org_settings_org_id ON ws_org_settings(org_id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE ws_org_settings IS 
'Organization-specific workspace policies and settings. One record per organization.';

COMMENT ON COLUMN ws_org_settings.allow_user_creation IS 
'Whether regular users can create workspaces (true) or only admins can (false)';

COMMENT ON COLUMN ws_org_settings.require_approval IS 
'Whether workspace creation requires admin approval';

COMMENT ON COLUMN ws_org_settings.max_workspaces_per_user IS 
'Maximum number of workspaces a user can own in this organization (1-100)';

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger: Update updated_at on modification
CREATE OR REPLACE FUNCTION update_ws_org_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ws_org_settings_updated_at ON ws_org_settings;
CREATE TRIGGER trigger_update_ws_org_settings_updated_at
    BEFORE UPDATE ON ws_org_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_ws_org_settings_updated_at();

COMMENT ON TRIGGER trigger_update_ws_org_settings_updated_at ON ws_org_settings IS 
'Automatically updates the updated_at timestamp when a record is modified';
