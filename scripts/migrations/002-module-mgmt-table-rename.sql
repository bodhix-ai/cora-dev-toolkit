-- =============================================================================
-- Migration: Module-Mgmt Table Rename (DB Naming Compliance)
-- =============================================================================
-- Purpose: Rename module-mgmt tables to comply with DATABASE-NAMING standard
-- Phase: Admin Standardization Sprint 3a - Phase 0
-- Date: January 2026
-- 
-- Tables renamed:
--   sys_lambda_config       → mgmt_cfg_sys_lambda
--   sys_module_registry     → mgmt_cfg_sys_modules
--   sys_module_usage        → mgmt_usage_modules
--   sys_module_usage_daily  → mgmt_usage_modules_daily
-- =============================================================================

BEGIN;

-- =============================================================================
-- Step 1: Create new tables with correct naming
-- =============================================================================

-- Config table for Lambda management
CREATE TABLE IF NOT EXISTS mgmt_cfg_sys_lambda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT config_key_format CHECK (config_key ~ '^[a-z0-9_]+$'),
    CONSTRAINT config_value_not_empty CHECK (jsonb_typeof(config_value) IS NOT NULL)
);

-- Config table for module registry
CREATE TABLE IF NOT EXISTS mgmt_cfg_sys_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    module_type VARCHAR(20) NOT NULL DEFAULT 'functional' 
        CHECK (module_type IN ('core', 'functional')),
    tier INTEGER NOT NULL DEFAULT 1 
        CHECK (tier BETWEEN 1 AND 3),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_installed BOOLEAN NOT NULL DEFAULT true,
    version VARCHAR(50),
    min_compatible_version VARCHAR(50),
    config JSONB DEFAULT '{}'::jsonb,
    feature_flags JSONB DEFAULT '{}'::jsonb,
    dependencies JSONB DEFAULT '[]'::jsonb,
    nav_config JSONB DEFAULT '{}'::jsonb,
    required_permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT module_name_format CHECK (module_name ~ '^module-[a-z]+$')
);

-- Usage tracking tables
CREATE TABLE IF NOT EXISTS mgmt_usage_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES mgmt_cfg_sys_modules(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL,
    org_id UUID NOT NULL,
    user_id UUID,
    event_type VARCHAR(50) NOT NULL DEFAULT 'api_call'
        CHECK (event_type IN ('api_call', 'page_view', 'feature_use', 'error', 'export', 'import')),
    event_action VARCHAR(100),
    event_metadata JSONB DEFAULT '{}'::jsonb,
    request_id UUID,
    endpoint VARCHAR(255),
    http_method VARCHAR(10),
    duration_ms INTEGER,
    status VARCHAR(20) DEFAULT 'success'
        CHECK (status IN ('success', 'failure', 'partial')),
    error_code VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    event_date DATE
);

CREATE TABLE IF NOT EXISTS mgmt_usage_modules_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES mgmt_cfg_sys_modules(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL,
    org_id UUID NOT NULL,
    usage_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    total_events INTEGER NOT NULL DEFAULT 0,
    successful_events INTEGER NOT NULL DEFAULT 0,
    failed_events INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,
    total_duration_ms BIGINT DEFAULT 0,
    avg_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mgmt_usage_modules_daily_unique UNIQUE (module_id, org_id, usage_date, event_type)
);

-- =============================================================================
-- Step 2: Copy data from old tables to new (if old tables exist)
-- =============================================================================

DO $$
BEGIN
    -- Copy Lambda config data
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sys_lambda_config') THEN
        INSERT INTO mgmt_cfg_sys_lambda 
        SELECT * FROM sys_lambda_config
        ON CONFLICT (config_key) DO NOTHING;
        
        RAISE NOTICE 'Copied % rows from sys_lambda_config to mgmt_cfg_sys_lambda', 
            (SELECT COUNT(*) FROM mgmt_cfg_sys_lambda);
    END IF;
    
    -- Copy module registry data
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sys_module_registry') THEN
        INSERT INTO mgmt_cfg_sys_modules 
        SELECT * FROM sys_module_registry
        ON CONFLICT (module_name) DO NOTHING;
        
        RAISE NOTICE 'Copied % rows from sys_module_registry to mgmt_cfg_sys_modules', 
            (SELECT COUNT(*) FROM mgmt_cfg_sys_modules);
    END IF;
    
    -- Copy usage data (if exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sys_module_usage') THEN
        -- Update foreign key references to new module table
        INSERT INTO mgmt_usage_modules 
        SELECT 
            u.id,
            m.id as module_id,  -- Map to new module table
            u.module_name,
            u.org_id,
            u.user_id,
            u.event_type,
            u.event_action,
            u.event_metadata,
            u.request_id,
            u.endpoint,
            u.http_method,
            u.duration_ms,
            u.status,
            u.error_code,
            u.error_message,
            u.created_at,
            u.event_date
        FROM sys_module_usage u
        JOIN mgmt_cfg_sys_modules m ON u.module_name = m.module_name
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Copied % rows from sys_module_usage to mgmt_usage_modules', 
            (SELECT COUNT(*) FROM mgmt_usage_modules);
    END IF;
    
    -- Copy daily usage data (if exists)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sys_module_usage_daily') THEN
        INSERT INTO mgmt_usage_modules_daily 
        SELECT 
            d.id,
            m.id as module_id,  -- Map to new module table
            d.module_name,
            d.org_id,
            d.usage_date,
            d.event_type,
            d.total_events,
            d.successful_events,
            d.failed_events,
            d.unique_users,
            d.total_duration_ms,
            d.avg_duration_ms,
            d.created_at,
            d.updated_at
        FROM sys_module_usage_daily d
        JOIN mgmt_cfg_sys_modules m ON d.module_name = m.module_name
        ON CONFLICT (module_id, org_id, usage_date, event_type) DO NOTHING;
        
        RAISE NOTICE 'Copied % rows from sys_module_usage_daily to mgmt_usage_modules_daily', 
            (SELECT COUNT(*) FROM mgmt_usage_modules_daily);
    END IF;
END $$;

-- =============================================================================
-- Step 3: Create indexes with correct naming
-- =============================================================================

-- mgmt_cfg_sys_lambda indexes
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_lambda_key ON mgmt_cfg_sys_lambda(config_key);
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_lambda_active ON mgmt_cfg_sys_lambda(is_active);
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_lambda_updated ON mgmt_cfg_sys_lambda(updated_at DESC);

-- mgmt_cfg_sys_modules indexes
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_modules_name 
    ON mgmt_cfg_sys_modules(module_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_modules_type 
    ON mgmt_cfg_sys_modules(module_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_modules_enabled 
    ON mgmt_cfg_sys_modules(is_enabled) WHERE deleted_at IS NULL AND is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_mgmt_cfg_sys_modules_tier 
    ON mgmt_cfg_sys_modules(tier) WHERE deleted_at IS NULL;

-- mgmt_usage_modules indexes
CREATE INDEX IF NOT EXISTS idx_mgmt_usage_modules_module_time 
    ON mgmt_usage_modules(module_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mgmt_usage_modules_org 
    ON mgmt_usage_modules(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mgmt_usage_modules_user 
    ON mgmt_usage_modules(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mgmt_usage_modules_event_type 
    ON mgmt_usage_modules(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mgmt_usage_modules_date 
    ON mgmt_usage_modules(event_date);
CREATE INDEX IF NOT EXISTS idx_mgmt_usage_modules_module_name 
    ON mgmt_usage_modules(module_name, created_at DESC);

-- mgmt_usage_modules_daily indexes
CREATE INDEX IF NOT EXISTS idx_mgmt_usage_modules_daily_module_date 
    ON mgmt_usage_modules_daily(module_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_mgmt_usage_modules_daily_org_date 
    ON mgmt_usage_modules_daily(org_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_mgmt_usage_modules_daily_date 
    ON mgmt_usage_modules_daily(usage_date DESC);

-- =============================================================================
-- Step 4: Enable RLS and create policies
-- =============================================================================

-- Enable RLS
ALTER TABLE mgmt_cfg_sys_lambda ENABLE ROW LEVEL SECURITY;
ALTER TABLE mgmt_cfg_sys_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mgmt_usage_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mgmt_usage_modules_daily ENABLE ROW LEVEL SECURITY;

-- Policies for mgmt_cfg_sys_lambda (system admins only)
DROP POLICY IF EXISTS "System admins can view all system configs" ON mgmt_cfg_sys_lambda;
CREATE POLICY "System admins can view all system configs" ON mgmt_cfg_sys_lambda
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
);

DROP POLICY IF EXISTS "System admins can insert system configs" ON mgmt_cfg_sys_lambda;
CREATE POLICY "System admins can insert system configs" ON mgmt_cfg_sys_lambda
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
);

DROP POLICY IF EXISTS "System admins can update system configs" ON mgmt_cfg_sys_lambda;
CREATE POLICY "System admins can update system configs" ON mgmt_cfg_sys_lambda
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
);

DROP POLICY IF EXISTS "System admins can delete system configs" ON mgmt_cfg_sys_lambda;
CREATE POLICY "System admins can delete system configs" ON mgmt_cfg_sys_lambda
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_profiles.user_id = auth.uid() 
        AND user_profiles.sys_role IN ('sys_owner', 'sys_admin')
    )
);

DROP POLICY IF EXISTS "Service role full access to mgmt_cfg_sys_lambda" ON mgmt_cfg_sys_lambda;
CREATE POLICY "Service role full access to mgmt_cfg_sys_lambda" ON mgmt_cfg_sys_lambda
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON mgmt_cfg_sys_lambda TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mgmt_cfg_sys_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mgmt_usage_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mgmt_usage_modules_daily TO authenticated;

-- =============================================================================
-- Step 5: Create triggers
-- =============================================================================

-- Lambda config updated_at trigger
CREATE OR REPLACE FUNCTION update_mgmt_cfg_sys_lambda_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mgmt_cfg_sys_lambda_updated_at ON mgmt_cfg_sys_lambda;
CREATE TRIGGER mgmt_cfg_sys_lambda_updated_at BEFORE UPDATE ON mgmt_cfg_sys_lambda
    FOR EACH ROW EXECUTE FUNCTION update_mgmt_cfg_sys_lambda_updated_at();

-- Module registry updated_at trigger
CREATE OR REPLACE FUNCTION update_mgmt_cfg_sys_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mgmt_cfg_sys_modules_timestamp ON mgmt_cfg_sys_modules;
CREATE TRIGGER trigger_update_mgmt_cfg_sys_modules_timestamp 
    BEFORE UPDATE ON mgmt_cfg_sys_modules
    FOR EACH ROW EXECUTE FUNCTION update_mgmt_cfg_sys_modules_updated_at();

-- Usage event_date trigger
CREATE OR REPLACE FUNCTION set_event_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.event_date := NEW.created_at::DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS set_mgmt_usage_modules_event_date ON mgmt_usage_modules;
CREATE TRIGGER set_mgmt_usage_modules_event_date BEFORE INSERT ON mgmt_usage_modules
    FOR EACH ROW EXECUTE FUNCTION set_event_date();

-- =============================================================================
-- Step 6: Rename old tables (for safety) and create backward-compatible views
-- =============================================================================

-- Rename old tables to _old suffix (for rollback safety)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sys_lambda_config') THEN
        ALTER TABLE sys_lambda_config RENAME TO sys_lambda_config_old;
        RAISE NOTICE 'Renamed sys_lambda_config to sys_lambda_config_old';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sys_module_registry') THEN
        ALTER TABLE sys_module_registry RENAME TO sys_module_registry_old;
        RAISE NOTICE 'Renamed sys_module_registry to sys_module_registry_old';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sys_module_usage') THEN
        ALTER TABLE sys_module_usage RENAME TO sys_module_usage_old;
        RAISE NOTICE 'Renamed sys_module_usage to sys_module_usage_old';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sys_module_usage_daily') THEN
        ALTER TABLE sys_module_usage_daily RENAME TO sys_module_usage_daily_old;
        RAISE NOTICE 'Renamed sys_module_usage_daily to sys_module_usage_daily_old';
    END IF;
END $$;

-- Create backward-compatible views pointing to new tables
CREATE OR REPLACE VIEW sys_lambda_config AS SELECT * FROM mgmt_cfg_sys_lambda;
CREATE OR REPLACE VIEW sys_module_registry AS SELECT * FROM mgmt_cfg_sys_modules;
CREATE OR REPLACE VIEW sys_module_usage AS SELECT * FROM mgmt_usage_modules;
CREATE OR REPLACE VIEW sys_module_usage_daily AS SELECT * FROM mgmt_usage_modules_daily;

-- =============================================================================
-- Step 7: Add comments
-- =============================================================================

COMMENT ON TABLE mgmt_cfg_sys_lambda IS 'System-level Lambda management configurations';
COMMENT ON TABLE mgmt_cfg_sys_modules IS 'Registry of all CORA modules with their configuration and status';
COMMENT ON TABLE mgmt_usage_modules IS 'Raw usage events for all modules - used for detailed analytics';
COMMENT ON TABLE mgmt_usage_modules_daily IS 'Aggregated daily usage statistics for dashboard display';

COMMIT;

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- Next steps:
-- 1. Verify data was copied correctly: SELECT COUNT(*) FROM each new table
-- 2. Test Lambda functions work with new table names
-- 3. Update validator whitelist to remove old table names
-- 4. Old tables renamed to *_old (for emergency rollback)
-- 5. After 1 week of stable operation, drop old tables:
--    DROP TABLE IF EXISTS sys_lambda_config_old CASCADE;
--    DROP TABLE IF EXISTS sys_module_registry_old CASCADE;
--    DROP TABLE IF EXISTS sys_module_usage_old CASCADE;
--    DROP TABLE IF EXISTS sys_module_usage_daily_old CASCADE;
-- =============================================================================
