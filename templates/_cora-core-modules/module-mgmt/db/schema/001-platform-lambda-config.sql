-- Lambda Management Module - Platform Lambda Config Table
-- Created: December 8, 2025
-- Purpose: Store Lambda warming schedules and future management configurations

-- Drop existing table if it exists (for development)
DROP TABLE IF EXISTS platform_lambda_config CASCADE;

-- Create platform_lambda_config table
CREATE TABLE platform_lambda_config (
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

-- Create indexes for common queries
CREATE INDEX idx_platform_lambda_config_key ON platform_lambda_config(config_key);
CREATE INDEX idx_platform_lambda_config_active ON platform_lambda_config(is_active);
CREATE INDEX idx_platform_lambda_config_updated ON platform_lambda_config(updated_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_platform_lambda_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_lambda_config_updated_at
    BEFORE UPDATE ON platform_lambda_config
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_lambda_config_updated_at();

-- Insert default lambda_warming configuration
INSERT INTO platform_lambda_config (config_key, config_value, description, is_active)
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
);

COMMENT ON TABLE platform_lambda_config IS 'Platform-level Lambda management configurations including warming schedules, monitoring settings, and performance parameters';
COMMENT ON COLUMN platform_lambda_config.config_key IS 'Unique configuration key (e.g., lambda_warming, monitoring_settings)';
COMMENT ON COLUMN platform_lambda_config.config_value IS 'JSONB configuration value - structure depends on config_key';
COMMENT ON COLUMN platform_lambda_config.description IS 'Human-readable description of configuration purpose';
COMMENT ON COLUMN platform_lambda_config.is_active IS 'Whether this configuration is currently active';
COMMENT ON COLUMN platform_lambda_config.created_by IS 'Super admin user who created this configuration';
COMMENT ON COLUMN platform_lambda_config.updated_by IS 'Super admin user who last updated this configuration';
