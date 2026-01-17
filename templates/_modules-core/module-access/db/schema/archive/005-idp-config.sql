-- =============================================================================
-- IDP (Identity Provider) Configuration Schema
-- =============================================================================
-- Stores identity provider configurations for the platform.
-- Supports multiple IDPs (Clerk, Okta) with only one active at a time.
--
-- Initial configuration is seeded from environment variables during setup,
-- then can be updated by platform admins via the admin dashboard.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: platform_idp_config
-- Stores IDP provider configurations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_idp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Provider identification
    provider_type VARCHAR(50) NOT NULL,  -- 'clerk' | 'okta'
    display_name VARCHAR(255) NOT NULL,  -- Human-readable name
    
    -- Provider configuration (encrypted in production)
    config JSONB NOT NULL DEFAULT '{}',
    -- For Okta: { client_id, issuer, jwks_uri }
    -- For Clerk: { publishable_key, issuer }
    -- Note: client_secret is stored separately in AWS Secrets Manager
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT false,  -- Only one provider can be active
    is_configured BOOLEAN NOT NULL DEFAULT false,  -- Has all required config
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_provider_type CHECK (provider_type IN ('clerk', 'okta')),
    CONSTRAINT unique_provider_type UNIQUE (provider_type)
);

-- Only one active IDP at a time (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_idp 
    ON platform_idp_config (is_active) 
    WHERE is_active = true;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_idp_provider_type ON platform_idp_config(provider_type);

-- -----------------------------------------------------------------------------
-- Table: platform_idp_audit_log
-- Tracks changes to IDP configuration for compliance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_idp_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What changed
    idp_config_id UUID REFERENCES platform_idp_config(id),
    action VARCHAR(50) NOT NULL,  -- 'created', 'updated', 'activated', 'deactivated'
    
    -- Change details
    old_config JSONB,  -- Previous configuration (sensitive fields redacted)
    new_config JSONB,  -- New configuration (sensitive fields redacted)
    
    -- Who and when
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Request context
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_idp_audit_config ON platform_idp_audit_log(idp_config_id);
CREATE INDEX IF NOT EXISTS idx_idp_audit_performed_at ON platform_idp_audit_log(performed_at);

-- -----------------------------------------------------------------------------
-- Function: update_idp_timestamp
-- Updates the updated_at timestamp on IDP config changes
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_idp_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_idp_config_timestamp ON platform_idp_config;
DROP TRIGGER IF EXISTS trg_idp_config_timestamp ON platform_idp_config;
DROP TRIGGER IF EXISTS trg_idp_config_timestamp ON platform_idp_config;
CREATE TRIGGER trg_idp_config_timestamp BEFORE UPDATE ON platform_idp_config
    FOR EACH ROW
    EXECUTE FUNCTION update_idp_timestamp();

-- -----------------------------------------------------------------------------
-- Function: ensure_single_active_idp
-- Ensures only one IDP can be active at a time
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ensure_single_active_idp()
RETURNS TRIGGER AS $$
BEGIN
    -- If activating this IDP, deactivate all others
    IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
        UPDATE platform_idp_config 
        SET is_active = false, updated_at = NOW()
        WHERE id != NEW.id AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_active_idp ON platform_idp_config;
CREATE TRIGGER trg_single_active_idp
    BEFORE INSERT OR UPDATE OF is_active ON platform_idp_config
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_active_idp();

-- -----------------------------------------------------------------------------
-- Function: get_active_idp_config
-- Returns the currently active IDP configuration
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_active_idp_config()
RETURNS TABLE (
    provider_type VARCHAR(50),
    config JSONB,
    display_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.provider_type,
        p.config,
        p.display_name
    FROM platform_idp_config p
    WHERE p.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- RLS Policies
-- Only platform admins can read/modify IDP configuration
-- -----------------------------------------------------------------------------
ALTER TABLE platform_idp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_idp_audit_log ENABLE ROW LEVEL SECURITY;

-- Platform admins can read IDP config
DROP POLICY IF EXISTS idp_config_select_policy ON platform_idp_config;
CREATE POLICY idp_config_select_policy ON platform_idp_config
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles p
            WHERE p.user_id = auth.uid()
            AND p.global_role IN ('platform_owner', 'platform_admin')
        )
    );

-- Platform admins can insert IDP config
DROP POLICY IF EXISTS idp_config_insert_policy ON platform_idp_config;
CREATE POLICY idp_config_insert_policy ON platform_idp_config
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.global_role IN ('platform_owner', 'platform_admin')
        )
    );

-- Platform admins can update IDP config
DROP POLICY IF EXISTS idp_config_update_policy ON platform_idp_config;
CREATE POLICY idp_config_update_policy ON platform_idp_config
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.global_role IN ('platform_owner', 'platform_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.global_role IN ('platform_owner', 'platform_admin')
        )
    );

-- Platform admins can read audit log
DROP POLICY IF EXISTS idp_audit_select_policy ON platform_idp_audit_log;
CREATE POLICY idp_audit_select_policy ON platform_idp_audit_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles p 
            WHERE p.user_id = auth.uid() 
            AND p.global_role IN ('platform_owner', 'platform_admin')
        )
    );

-- Service role can insert audit logs (from Lambda)
DROP POLICY IF EXISTS idp_audit_insert_policy ON platform_idp_audit_log;
CREATE POLICY idp_audit_insert_policy ON platform_idp_audit_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Seed initial IDP configurations (empty, to be populated during setup)
-- -----------------------------------------------------------------------------
INSERT INTO platform_idp_config (provider_type, display_name, config, is_configured, is_active)
VALUES 
    ('clerk', 'Clerk', '{}', false, false),
    ('okta', 'Okta', '{}', false, false)
ON CONFLICT (provider_type) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Comments
-- -----------------------------------------------------------------------------
COMMENT ON TABLE platform_idp_config IS 'Identity Provider configurations for the platform';
COMMENT ON TABLE platform_idp_audit_log IS 'Audit log for IDP configuration changes';
COMMENT ON COLUMN platform_idp_config.config IS 'Provider-specific configuration (public settings only, secrets in AWS SM)';
COMMENT ON COLUMN platform_idp_config.is_active IS 'Only one IDP can be active at a time';
