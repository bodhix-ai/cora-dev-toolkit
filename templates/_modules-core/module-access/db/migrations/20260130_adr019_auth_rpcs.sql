-- =============================================================================
-- Migration: ADR-019 Auth Standardization - RPC Functions
-- =============================================================================
-- Date: 2026-01-30
-- Purpose: Add standard RPC functions for admin authorization checks
-- ADR: docs/arch decisions/ADR-019-AUTH-STANDARDIZATION.md
-- Migration Type: IDEMPOTENT (safe to run multiple times)
--
-- BACKWARD COMPATIBILITY: This migration uses NEW FUNCTION NAMES to avoid
-- breaking existing RLS policies and lambdas that use old is_* functions.
--
-- New functions (ADR-019 standard):
-- - check_sys_admin(p_user_id UUID) - Check system admin privileges
-- - check_org_admin(p_user_id UUID, p_org_id UUID) - Check org admin privileges
-- - check_ws_admin(p_user_id UUID, p_ws_id UUID) - Check workspace admin privileges
--
-- Old functions (KEPT for backward compatibility - DO NOT MODIFY):
-- - is_sys_admin(TEXT) - Used by existing RLS policies
-- - is_org_admin(TEXT, TEXT) - Used by existing RLS policies
-- - is_ws_admin_or_owner(UUID, UUID) - Used by existing RLS policies
--
-- Migration strategy:
-- Phase 1 (THIS): Add new check_* functions alongside old is_* functions
-- Phase 2: Update lambdas to use new org-common helpers (call check_* functions)
-- Phase 3 (FUTURE): Update RLS policies to use check_* functions
-- Phase 4 (FUTURE): Drop old is_* functions after all consumers migrated
-- =============================================================================

-- =============================================================================
-- System Admin Check (NEW FUNCTION NAME)
-- =============================================================================
-- Uses UUID parameter (standard) - lambdas convert external UID to UUID first

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
-- Organization Admin Check (NEW FUNCTION NAME)
-- =============================================================================
-- Uses UUID parameters (standard)

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
-- Workspace Admin Check (NEW FUNCTION NAME)
-- =============================================================================
-- Uses UUID parameters (standard)
-- Note: is_ws_admin_or_owner is kept for backward compatibility

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
-- BACKWARD COMPATIBILITY NOTES
-- =============================================================================
-- The following OLD functions are intentionally KEPT and NOT MODIFIED:
-- - is_sys_admin(TEXT) - Used by existing RLS policies
-- - is_org_admin(TEXT, TEXT) - Used by existing RLS policies  
-- - is_ws_admin_or_owner(UUID, UUID) - Used by existing RLS policies
--
-- These will be deprecated in a future migration AFTER:
-- 1. All lambdas migrated to use org-common check_* helpers
-- 2. All RLS policies updated to use check_* functions
-- =============================================================================

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
-- Run these queries after applying the migration to verify the functions work:
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

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- ✅ Migration complete!
-- 
-- Next steps:
-- 1. Update org-common Lambda layer to call these new RPC functions
-- 2. Rebuild and deploy org-common layer
-- 3. Migrate lambdas to use new helper functions:
--    - common.check_sys_admin(user_id) -> calls check_sys_admin RPC
--    - common.check_org_admin(user_id, org_id) -> calls check_org_admin RPC
--    - common.check_ws_admin(user_id, ws_id) -> calls check_ws_admin RPC
-- 
-- IMPORTANT: Old is_* functions are NOT touched, so existing code continues to work!
-- =============================================================================