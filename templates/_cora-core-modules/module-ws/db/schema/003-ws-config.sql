-- =============================================
-- MODULE-WS: Workspace Config Table
-- =============================================
-- Purpose: Platform-level configuration for workspace module behavior and UI customization
-- Source: Created for CORA toolkit Dec 2025

-- =============================================
-- WS_CONFIG TABLE (Singleton)
-- =============================================

CREATE TABLE IF NOT EXISTS public.ws_config (
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
    CONSTRAINT ws_config_color_check CHECK (default_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.ws_config IS 'Platform-level configuration for workspace module (singleton)';
COMMENT ON COLUMN public.ws_config.nav_label_singular IS 'Navigation label (singular): Workspace, Audit, Campaign, Proposal, etc.';
COMMENT ON COLUMN public.ws_config.nav_label_plural IS 'Navigation label (plural): Workspaces, Audits, Campaigns, Proposals, etc.';
COMMENT ON COLUMN public.ws_config.nav_icon IS 'Material UI icon name for navigation sidebar';
COMMENT ON COLUMN public.ws_config.enable_favorites IS 'Enable/disable favorites functionality';
COMMENT ON COLUMN public.ws_config.enable_tags IS 'Enable/disable tags functionality';
COMMENT ON COLUMN public.ws_config.enable_color_coding IS 'Enable/disable color customization';
COMMENT ON COLUMN public.ws_config.default_color IS 'Default hex color for new workspaces';
COMMENT ON COLUMN public.ws_config.updated_by IS 'Platform admin who last updated configuration';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.ws_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read config
DROP POLICY IF EXISTS "Everyone can view ws_config" ON public.ws_config;
CREATE POLICY "Everyone can view ws_config" ON public.ws_config
FOR SELECT
TO authenticated
USING (true);

-- Only platform admins/owners can update
DROP POLICY IF EXISTS "Platform admins can update ws_config" ON public.ws_config;
CREATE POLICY "Platform admins can update ws_config" ON public.ws_config
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.global_role IN ('platform_owner', 'platform_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.global_role IN ('platform_owner', 'platform_admin')
    )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to ws_config" ON public.ws_config;
CREATE POLICY "Service role full access to ws_config" ON public.ws_config
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, UPDATE ON public.ws_config TO authenticated;

COMMENT ON POLICY "Everyone can view ws_config" ON public.ws_config IS 'All authenticated users can read workspace configuration';
COMMENT ON POLICY "Platform admins can update ws_config" ON public.ws_config IS 'Only platform_owner and platform_admin can modify configuration';

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_ws_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ws_config_updated_at ON public.ws_config;
CREATE TRIGGER ws_config_updated_at 
    BEFORE UPDATE ON public.ws_config
    FOR EACH ROW
    EXECUTE FUNCTION update_ws_config_updated_at();

-- =============================================
-- SEED DATA: Default Configuration
-- =============================================
-- Idempotent: Creates singleton record if not exists

INSERT INTO public.ws_config (
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
