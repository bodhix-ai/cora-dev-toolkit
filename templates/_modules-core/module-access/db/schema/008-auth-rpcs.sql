-- =============================================================================
-- ADR-019: Auth Standardization - RPC Functions
-- =============================================================================
-- Purpose: Provide standard RPC functions for admin authorization checks
-- Author: CORA Dev Toolkit
-- Created: 2026-01-30
-- Updated: 2026-01-31 (renamed to check_* for backward compatibility)
-- ADR: docs/arch decisions/ADR-019-AUTH-STANDARDIZATION.md
--
-- These functions are called by the org-common helper functions:
-- - common.check_sys_admin(user_id) -> calls check_sys_admin(p_user_id) RPC
-- - common.check_org_admin(user_id, org_id) -> calls check_org_admin(p_user_id, p_org_id) RPC
-- - common.check_ws_admin(user_id, ws_id) -> calls check_ws_admin(p_user_id, p_ws_id) RPC
--
-- NAMING CONVENTION: check_* (not is_*) to avoid conflicts with existing functions
-- that may exist in legacy databases with different signatures.
--
-- These functions use parameterized queries to prevent SQL injection and
-- enforce authorization at the database level.
-- =============================================================================

-- =============================================================================
-- System Admin Check
-- =============================================================================

CREATE OR REPLACE FUNCTION check_sys_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has sys_owner or sys_admin role
    -- Note: user_profiles table doesn't have deleted_at column
    RETURN EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE user_id = p_user_id
        AND sys_role IN ('sys_owner', 'sys_admin')
    );
END;
$$;

COMMENT ON FUNCTION check_sys_admin(UUID) IS 'ADR-019: Check if user has system admin privileges (sys_owner or sys_admin)';

-- =============================================================================
-- Organization Admin Check
-- =============================================================================

CREATE OR REPLACE FUNCTION check_org_admin(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has org_owner or org_admin role in the specified organization
    -- Note: org_members table doesn't have soft-delete columns
    RETURN EXISTS (
        SELECT 1
        FROM org_members
        WHERE user_id = p_user_id
        AND org_id = p_org_id
        AND org_role IN ('org_owner', 'org_admin')
    );
END;
$$;

COMMENT ON FUNCTION check_org_admin(UUID, UUID) IS 'ADR-019: Check if user has organization admin privileges (org_owner or org_admin)';

-- =============================================================================
-- Workspace Admin Check
-- =============================================================================

CREATE OR REPLACE FUNCTION check_ws_admin(p_user_id UUID, p_ws_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has ws_owner or ws_admin role in the specified workspace
    -- Note: ws_members uses ws_role column (not role) and has deleted_at for soft-delete
    RETURN EXISTS (
        SELECT 1
        FROM ws_members
        WHERE user_id = p_user_id
        AND ws_id = p_ws_id
        AND ws_role IN ('ws_owner', 'ws_admin')
        AND deleted_at IS NULL
    );
END;
$$;

COMMENT ON FUNCTION check_ws_admin(UUID, UUID) IS 'ADR-019: Check if user has workspace admin privileges (ws_owner or ws_admin)';

-- =============================================================================
-- Grant Execute Permissions
-- =============================================================================

-- Grant execute to authenticated users (functions use SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION check_sys_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_org_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_ws_admin(UUID, UUID) TO authenticated;

-- =============================================================================
-- Verification Queries
-- =============================================================================
-- Run these queries after applying the schema to verify the functions work:
--
-- Test sys admin check:
-- SELECT check_sys_admin('user-uuid-here'::uuid);
--
-- Test org admin check:
-- SELECT check_org_admin('user-uuid-here'::uuid, 'org-uuid-here'::uuid);
--
-- Test workspace admin check:
-- SELECT check_ws_admin('user-uuid-here'::uuid, 'ws-uuid-here'::uuid);
-- =============================================================================
