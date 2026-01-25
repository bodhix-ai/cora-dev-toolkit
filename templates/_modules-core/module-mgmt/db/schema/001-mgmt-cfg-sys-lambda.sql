-- =============================================
-- MODULE-MGMT: System Lambda Config
-- =============================================
-- Purpose: System-level Lambda management configurations
-- Source: Created for CORA toolkit Dec 2025
-- Updated: Jan 2026 - Renamed from sys_lambda_config to mgmt_cfg_sys_lambda (DB naming compliance)

-- =============================================
-- MGMT_CFG_SYS_LAMBDA TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.mgmt_cfg_sys_lambda (
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

CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_lambda_key ON public.mgmt_cfg_sys_lambda(config_key);
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_lambda_active ON public.mgmt_cfg_sys_lambda(is_active);
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_lambda_updated ON public.mgmt_cfg_sys_lambda(updated_at DESC);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.mgmt_cfg_sys_lambda IS 'System-level Lambda management configurations including warming schedules, monitoring settings, and performance parameters';
COMMENT ON COLUMN public.mgmt_cfg_sys_lambda.config_key IS 'Unique configuration key (e.g., lambda_warming, monitoring_settings)';
COMMENT ON COLUMN public.mgmt_cfg_sys_lambda.config_value IS 'JSONB configuration value - structure depends on config_key';
COMMENT ON COLUMN public.mgmt_cfg_sys_lambda.description IS 'Human-readable description of configuration purpose';
COMMENT ON COLUMN public.mgmt_cfg_sys_lambda.is_active IS 'Whether this configuration is currently active';
COMMENT ON COLUMN public.mgmt_cfg_sys_lambda.created_by IS 'System admin who created this configuration';
COMMENT ON COLUMN public.mgmt_cfg_sys_lambda.updated_by IS 'System admin who last updated this configuration';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.mgmt_cfg_sys_lambda ENABLE ROW LEVEL SECURITY;

-- System admins can view all system configs
DROP POLICY IF EXISTS "System admins can view all system configs" ON public.mgmt_cfg_sys_lambda;
CREATE POLICY "System admins can view all system configs" ON public.mgmt_cfg_sys_lambda
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
DROP POLICY IF EXISTS "System admins can insert system configs" ON public.mgmt_cfg_sys_lambda;
CREATE POLICY "System admins can insert system configs" ON public.mgmt_cfg_sys_lambda
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
DROP POLICY IF EXISTS "System admins can update system configs" ON public.mgmt_cfg_sys_lambda;
CREATE POLICY "System admins can update system configs" ON public.mgmt_cfg_sys_lambda
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
DROP POLICY IF EXISTS "System admins can delete system configs" ON public.mgmt_cfg_sys_lambda;
CREATE POLICY "System admins can delete system configs" ON public.mgmt_cfg_sys_lambda
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
DROP POLICY IF EXISTS "Service role full access to mgmt_cfg_sys_lambda" ON public.mgmt_cfg_sys_lambda;
CREATE POLICY "Service role full access to mgmt_cfg_sys_lambda" ON public.mgmt_cfg_sys_lambda
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage to authenticated users (RLS policies will restrict actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mgmt_cfg_sys_lambda TO authenticated;

COMMENT ON POLICY "System admins can view all system configs" ON public.mgmt_cfg_sys_lambda IS 'Only sys_owner and sys_admin roles can view system Lambda configurations';
COMMENT ON POLICY "System admins can insert system configs" ON public.mgmt_cfg_sys_lambda IS 'Only sys_owner and sys_admin roles can create system Lambda configurations';
COMMENT ON POLICY "System admins can update system configs" ON public.mgmt_cfg_sys_lambda IS 'Only sys_owner and sys_admin roles can update system Lambda configurations';
COMMENT ON POLICY "System admins can delete system configs" ON public.mgmt_cfg_sys_lambda IS 'Only sys_owner and sys_admin roles can delete system Lambda configurations';

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_mgmt_cfg_sys_lambda_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mgmt_cfg_sys_lambda_updated_at ON public.mgmt_cfg_sys_lambda;
CREATE TRIGGER mgmt_cfg_sys_lambda_updated_at BEFORE UPDATE ON public.mgmt_cfg_sys_lambda
    FOR EACH ROW
    EXECUTE FUNCTION update_mgmt_cfg_sys_lambda_updated_at();

-- =============================================
-- SEED DATA: Default Lambda Warming Config
-- =============================================
-- Idempotent: Safe to run multiple times

INSERT INTO public.mgmt_cfg_sys_lambda (config_key, config_value, description, is_active)
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