-- ============================================================================
-- CORA Module Registry - Row Level Security Policies
-- Schema: 005-platform-module-rls.sql
-- Purpose: Implement RLS policies for multi-tenant security
-- ============================================================================

-- ============================================================================
-- Enable RLS on Tables
-- ============================================================================

ALTER TABLE platform_module_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_module_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_module_usage_daily ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get current user's organization ID from JWT claims
-- This function should be customized based on your auth implementation
CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS UUID AS $$
BEGIN
    -- Extract org_id from JWT claims (Supabase style)
    -- Customize this based on your auth implementation
    RETURN NULLIF(
        current_setting('request.jwt.claims', true)::jsonb->>'org_id',
        ''
    )::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user is a platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check for platform admin role in JWT claims
    -- Customize this based on your auth implementation
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb->>'is_platform_admin')::boolean,
        false
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if current user is an org admin
CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check for org admin role in JWT claims
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb->>'is_org_admin')::boolean,
        false
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- RLS Policies for platform_module_registry
-- ============================================================================

-- Policy: Anyone can read enabled modules (for navigation)
CREATE POLICY module_registry_select_enabled ON platform_module_registry
    FOR SELECT
    USING (
        deleted_at IS NULL 
        AND is_enabled = true
    );

-- Policy: Platform admins can read all modules (including disabled)
CREATE POLICY module_registry_select_admin ON platform_module_registry
    FOR SELECT
    USING (
        is_platform_admin() 
        AND deleted_at IS NULL
    );

-- Policy: Platform admins can insert modules
CREATE POLICY module_registry_insert_admin ON platform_module_registry
    FOR INSERT
    WITH CHECK (is_platform_admin());

-- Policy: Platform admins can update modules
CREATE POLICY module_registry_update_admin ON platform_module_registry
    FOR UPDATE
    USING (is_platform_admin())
    WITH CHECK (is_platform_admin());

-- Policy: Platform admins can delete (soft delete) modules
CREATE POLICY module_registry_delete_admin ON platform_module_registry
    FOR DELETE
    USING (is_platform_admin());

-- ============================================================================
-- RLS Policies for platform_module_usage
-- ============================================================================

-- Policy: Users can insert their own usage records
CREATE POLICY module_usage_insert_own ON platform_module_usage
    FOR INSERT
    WITH CHECK (
        org_id = get_current_org_id()
    );

-- Policy: Org admins can read their organization's usage
CREATE POLICY module_usage_select_org ON platform_module_usage
    FOR SELECT
    USING (
        org_id = get_current_org_id()
        AND (is_org_admin() OR is_platform_admin())
    );

-- Policy: Platform admins can read all usage
CREATE POLICY module_usage_select_platform_admin ON platform_module_usage
    FOR SELECT
    USING (is_platform_admin());

-- Policy: No direct updates to usage records (immutable audit log)
-- Updates happen only through aggregation functions

-- Policy: Platform admins can delete old usage records (for cleanup)
CREATE POLICY module_usage_delete_admin ON platform_module_usage
    FOR DELETE
    USING (is_platform_admin());

-- ============================================================================
-- RLS Policies for platform_module_usage_daily
-- ============================================================================

-- Policy: Org admins can read their organization's daily stats
CREATE POLICY usage_daily_select_org ON platform_module_usage_daily
    FOR SELECT
    USING (
        org_id = get_current_org_id()
        AND (is_org_admin() OR is_platform_admin())
    );

-- Policy: Platform admins can read all daily stats
CREATE POLICY usage_daily_select_platform_admin ON platform_module_usage_daily
    FOR SELECT
    USING (is_platform_admin());

-- Policy: Only system can insert/update daily stats (via aggregation function)
-- The aggregation function runs with SECURITY DEFINER

-- Policy: Platform admins can delete old daily stats (for cleanup)
CREATE POLICY usage_daily_delete_admin ON platform_module_usage_daily
    FOR DELETE
    USING (is_platform_admin());

-- ============================================================================
-- Service Role Bypass
-- ============================================================================

-- NOTE: In Supabase, the service_role key automatically bypasses RLS.
-- Lambda functions use the service_role key and have full database access.
-- No explicit service_role policies are needed.

-- For custom implementations (non-Supabase), create a dedicated service user:
-- CREATE ROLE cora_service_role NOINHERIT;
-- GRANT ALL ON platform_module_registry TO cora_service_role;
-- GRANT ALL ON platform_module_usage TO cora_service_role;
-- GRANT ALL ON platform_module_usage_daily TO cora_service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION get_current_org_id IS 'Extract current user org_id from JWT claims';
COMMENT ON FUNCTION is_platform_admin IS 'Check if current user is a platform administrator';
COMMENT ON FUNCTION is_org_admin IS 'Check if current user is an organization administrator';

COMMENT ON POLICY module_registry_select_enabled ON platform_module_registry IS 'Allow read access to enabled modules for navigation';
COMMENT ON POLICY module_registry_select_admin ON platform_module_registry IS 'Allow platform admins to read all modules';
COMMENT ON POLICY module_usage_select_org ON platform_module_usage IS 'Allow org admins to read their org usage data';
COMMENT ON POLICY usage_daily_select_org ON platform_module_usage_daily IS 'Allow org admins to read their org daily stats';
