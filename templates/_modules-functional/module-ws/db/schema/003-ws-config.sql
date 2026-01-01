-- =============================================
-- MODULE-WS: Workspace Config Table
-- =============================================
-- Purpose: Platform-level configuration for workspace module behavior and UI customization
-- Source: Created for CORA toolkit Dec 2025

-- =============================================
-- WS_CONFIGS TABLE (Singleton)
-- =============================================

CREATE TABLE IF NOT EXISTS public.ws_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nav_label_singular VARCHAR(50) NOT NULL DEFAULT 'Workspace',
    nav_label_plural VARCHAR(50) NOT NULL DEFAULT 'Workspaces',
    nav_icon VARCHAR(50) NOT NULL DEFAULT 'WorkspaceIcon',
    enable_favorites BOOLEAN NOT NULL DEFAULT true,
    enable_tags BOOLEAN NOT NULL DEFAULT true,
    enable_color_coding BOOLEAN NOT NULL DEFAULT true,
    default_color VARCHAR(7) NOT NULL DEFAULT '#1976d2',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT ws_configs_color_check CHECK (default_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ws_configs IS 'Platform-level configuration for workspace module (singleton)';
COMMENT ON COLUMN public.ws_configs.nav_label_singular IS 'Navigation label (singular): Workspace, Audit, Campaign, Proposal, etc.';
COMMENT ON COLUMN public.ws_configs.nav_label_plural IS 'Navigation label (plural): Workspaces, Audits, Campaigns, Proposals, etc.';
COMMENT ON COLUMN public.ws_configs.nav_icon IS 'Material UI icon name for navigation sidebar';
COMMENT ON COLUMN public.ws_configs.enable_favorites IS 'Enable/disable favorites functionality';
COMMENT ON COLUMN public.ws_configs.enable_tags IS 'Enable/disable tags functionality';
COMMENT ON COLUMN public.ws_configs.enable_color_coding IS 'Enable/disable color customization';
COMMENT ON COLUMN public.ws_configs.default_color IS 'Default hex color for new workspaces';
COMMENT ON COLUMN public.ws_configs.updated_by IS 'Platform admin who last updated configuration';

-- =============================================
-- NOTE: Row Level Security (RLS) Policies
-- =============================================
-- RLS policies for this table are defined in 006-apply-rls.sql
-- This ensures all tables exist before applying security constraints

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_ws_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ws_configs_updated_at ON public.ws_configs;
CREATE TRIGGER ws_configs_updated_at 
    BEFORE UPDATE ON public.ws_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_ws_configs_updated_at();

-- =============================================
-- SEED DATA: Default Configuration
-- =============================================
-- Idempotent: Creates singleton record if not exists

INSERT INTO public.ws_configs (
    id,
    nav_label_singular,
    nav_label_plural,
    nav_icon,
    enable_favorites,
    enable_tags,
    enable_color_coding,
    default_color
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Workspace',
    'Workspaces',
    'WorkspaceIcon',
    true,
    true,
    true,
    '#1976d2'
)
ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();
