-- =============================================
-- MODULE-MGMT: System Lambda Config
-- =============================================
-- Purpose: System-level Lambda management configurations
-- Source: Created for CORA toolkit Dec 2025
-- Updated: Jan 2026 - Renamed from platform_* to sys_*

-- =============================================
-- SYS_LAMBDA_CONFIG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.sys_lambda_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT config_key_format CHECK (config_key ~ '^[a-z0-9_]+$'),
    CONSTRAINT config_value_not_empty CHECK (jsonb_typeof(config_value) IS NOT NULL)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_sys_lambda_config_key ON public.sys_lambda_config(config_key);
CREATE INDEX IF NOT EXISTS idx_sys_lambda_config_active ON public.sys_lambda_config(is_active);
CREATE INDEX IF NOT EXISTS idx_sys_lambda_config_updated ON public.sys_lambda_config(updated_at DESC);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.sys_lambda_config IS 'System-level Lambda management configurations including warming schedules, monitoring settings, and performance parameters';
COMMENT ON COLUMN public.sys_lambda_config.config_key IS 'Unique configuration key (e.g., lambda_warming, monitoring_settings)';
COMMENT ON COLUMN public.sys_lambda_config.config_value IS 'JSONB configuration value - structure depends on config_key';
COMMENT ON COLUMN public.sys_lambda_config.description IS 'Human-readable description of configuration purpose';
COMMENT ON COLUMN public.sys_lambda_config.is_active IS 'Whether this configuration is currently active';
COMMENT ON COLUMN public.sys_lambda_config.created_by IS 'System admin who created this configuration';
COMMENT ON COLUMN public.sys_lambda_config.updated_by IS 'System admin who last updated this configuration';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.sys_lambda_config ENABLE ROW LEVEL SECURITY;

-- System admins can view all system configs
DROP POLICY IF EXISTS "System admins can view all system configs" ON public.sys_lambda_config;
CREATE POLICY "System admins can view all system configs" ON public.sys_lambda_config
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
);

-- System admins can insert system configs
DROP POLICY IF EXISTS "System admins can insert system configs" ON public.sys_lambda_config;
CREATE POLICY "System admins can insert system configs" ON public.sys_lambda_config
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
);

-- System admins can update system configs
DROP POLICY IF EXISTS "System admins can update system configs" ON public.sys_lambda_config;
CREATE POLICY "System admins can update system configs" ON public.sys_lambda_config
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
);

-- System admins can delete system configs
DROP POLICY IF EXISTS "System admins can delete system configs" ON public.sys_lambda_config;
CREATE POLICY "System admins can delete system configs" ON public.sys_lambda_config
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
);

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access to sys_lambda_config" ON public.sys_lambda_config;
CREATE POLICY "Service role full access to sys_lambda_config" ON public.sys_lambda_config
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sys_lambda_config TO authenticated;

COMMENT ON POLICY "System admins can view all system configs" ON public.sys_lambda_config IS 'Only sys_owner and sys_admin roles can view system Lambda configurations';
COMMENT ON POLICY "System admins can insert system configs" ON public.sys_lambda_config IS 'Only sys_owner and sys_admin roles can create system Lambda configurations';
COMMENT ON POLICY "System admins can update system configs" ON public.sys_lambda_config IS 'Only sys_owner and sys_admin roles can update system Lambda configurations';
COMMENT ON POLICY "System admins can delete system configs" ON public.sys_lambda_config IS 'Only sys_owner and sys_admin roles can delete system Lambda configurations';

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_sys_lambda_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sys_lambda_config_updated_at ON public.sys_lambda_config;
CREATE TRIGGER sys_lambda_config_updated_at 
    BEFORE UPDATE ON public.sys_lambda_config
    FOR EACH ROW
    EXECUTE FUNCTION update_sys_lambda_config_updated_at();

-- =============================================
-- SEED DATA: Default Lambda Warming Config
-- =============================================
-- Idempotent: Safe to run multiple times

INSERT INTO public.sys_lambda_config (config_key, config_value, description, is_active)
VALUES (
    'lambda_warming',
    jsonb_build_object(
        'enabled', true,
        'timezone', 'America/New_York',
        'interval_minutes', 5,
        'weekly_schedule', jsonb_build_object(
            'monday', jsonb_build_object(
                'enabled', true,
                'ranges', jsonb_build_array(
                    jsonb_build_object('start', '09:00', 'end', '17:00')
                )
            ),
            'tuesday', jsonb_build_object(
                'enabled', true,
                'ranges', jsonb_build_array(
                    jsonb_build_object('start', '09:00', 'end', '17:00')
                )
            ),
            'wednesday', jsonb_build_object(
                'enabled', true,
                'ranges', jsonb_build_array(
                    jsonb_build_object('start', '09:00', 'end', '17:00')
                )
            ),
            'thursday', jsonb_build_object(
                'enabled', true,
                'ranges', jsonb_build_array(
                    jsonb_build_object('start', '09:00', 'end', '17:00')
                )
            ),
            'friday', jsonb_build_object(
                'enabled', true,
                'ranges', jsonb_build_array(
                    jsonb_build_object('start', '09:00', 'end', '17:00')
                )
            ),
            'saturday', jsonb_build_object('enabled', false, 'ranges', jsonb_build_array()),
            'sunday', jsonb_build_object('enabled', false, 'ranges', jsonb_build_array())
        )
    ),
    'Lambda warming schedule configuration - controls EventBridge rules for warming Lambda functions during business hours',
    true
)
ON CONFLICT (config_key) 
DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
