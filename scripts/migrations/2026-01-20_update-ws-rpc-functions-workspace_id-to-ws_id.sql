-- Migration: Update workspace_id to ws_id in ws module RPC functions
-- Date: 2026-01-20
-- Module: module-ws
-- Purpose: Fix naming standard violation (ADR-011, Rule 3)
-- Context: Schema naming compliance audit - workspace_id parameter should be ws_id
-- Reference: docs/standards/cora/standard_DATABASE-NAMING.md Rule 3
-- Plan: docs/plans/plan_schema-naming-compliance-audit.md
-- Note: No table changes - only RPC function parameter names

-- ============================================================================
-- IMPORTANT: This migration only updates RPC function parameters
-- No table schema changes are needed for module-ws
-- The underlying tables already use ws_id correctly
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop existing RPC functions (will be recreated with correct params)
-- ============================================================================

-- Drop workspace management functions
DROP FUNCTION IF EXISTS create_workspace(uuid, text, text, uuid[]);
DROP FUNCTION IF EXISTS update_workspace(uuid, text, text);
DROP FUNCTION IF EXISTS delete_workspace(uuid);
DROP FUNCTION IF EXISTS get_user_workspaces(uuid);
DROP FUNCTION IF EXISTS get_workspace_members(uuid);
DROP FUNCTION IF EXISTS add_workspace_member(uuid, uuid, text);
DROP FUNCTION IF EXISTS remove_workspace_member(uuid, uuid);
DROP FUNCTION IF EXISTS update_workspace_member_role(uuid, uuid, text);

-- ============================================================================
-- STEP 2: Recreate RPC functions with corrected parameter names
-- ============================================================================

-- Function: Create a new workspace
CREATE OR REPLACE FUNCTION create_workspace(
    p_org_id uuid,
    p_name text,
    p_description text DEFAULT NULL,
    p_initial_member_ids uuid[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ws_id uuid;
    v_member_id uuid;
BEGIN
    -- Insert workspace
    INSERT INTO workspaces (org_id, name, description)
    VALUES (p_org_id, p_name, p_description)
    RETURNING id INTO v_ws_id;
    
    -- Add creator as owner
    INSERT INTO ws_members (ws_id, user_id, ws_role)
    VALUES (v_ws_id, auth.uid(), 'owner');
    
    -- Add initial members if provided
    IF p_initial_member_ids IS NOT NULL THEN
        FOREACH v_member_id IN ARRAY p_initial_member_ids
        LOOP
            INSERT INTO ws_members (ws_id, user_id, ws_role)
            VALUES (v_ws_id, v_member_id, 'member')
            ON CONFLICT (ws_id, user_id) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN v_ws_id;
END;
$$;

-- Function: Update workspace details
CREATE OR REPLACE FUNCTION update_workspace(
    p_ws_id uuid,
    p_name text DEFAULT NULL,
    p_description text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify user is admin/owner
    IF NOT EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_ws_id
          AND user_id = auth.uid()
          AND ws_role IN ('admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin of this workspace';
    END IF;
    
    -- Update workspace
    UPDATE workspaces
    SET 
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        updated_at = NOW()
    WHERE id = p_ws_id;
    
    RETURN true;
END;
$$;

-- Function: Delete workspace (soft delete)
CREATE OR REPLACE FUNCTION delete_workspace(
    p_ws_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify user is owner
    IF NOT EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_ws_id
          AND user_id = auth.uid()
          AND ws_role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not the owner of this workspace';
    END IF;
    
    -- Soft delete workspace
    UPDATE workspaces
    SET is_deleted = true, updated_at = NOW()
    WHERE id = p_ws_id;
    
    RETURN true;
END;
$$;

-- Function: Get all workspaces for a user
CREATE OR REPLACE FUNCTION get_user_workspaces(
    p_user_id uuid
)
RETURNS TABLE (
    ws_id uuid,
    org_id uuid,
    name text,
    description text,
    ws_role text,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id as ws_id,
        w.org_id,
        w.name,
        w.description,
        wm.ws_role,
        w.created_at,
        w.updated_at
    FROM workspaces w
    JOIN ws_members wm ON wm.ws_id = w.id
    WHERE wm.user_id = p_user_id
      AND w.is_deleted = false
    ORDER BY w.updated_at DESC;
END;
$$;

-- Function: Get all members of a workspace
CREATE OR REPLACE FUNCTION get_workspace_members(
    p_ws_id uuid
)
RETURNS TABLE (
    user_id uuid,
    ws_role text,
    email text,
    full_name text,
    joined_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify user has access to workspace
    IF NOT EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_ws_id
          AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not a member of this workspace';
    END IF;
    
    RETURN QUERY
    SELECT 
        wm.user_id,
        wm.ws_role,
        up.email,
        up.full_name,
        wm.created_at as joined_at
    FROM ws_members wm
    JOIN user_profiles up ON up.id = wm.user_id
    WHERE wm.ws_id = p_ws_id
    ORDER BY wm.created_at ASC;
END;
$$;

-- Function: Add a member to a workspace
CREATE OR REPLACE FUNCTION add_workspace_member(
    p_ws_id uuid,
    p_user_id uuid,
    p_ws_role text DEFAULT 'member'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify requesting user is admin/owner
    IF NOT EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_ws_id
          AND user_id = auth.uid()
          AND ws_role IN ('admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin of this workspace';
    END IF;
    
    -- Add member
    INSERT INTO ws_members (ws_id, user_id, ws_role)
    VALUES (p_ws_id, p_user_id, p_ws_role)
    ON CONFLICT (ws_id, user_id) DO UPDATE
    SET ws_role = p_ws_role, updated_at = NOW();
    
    RETURN true;
END;
$$;

-- Function: Remove a member from a workspace
CREATE OR REPLACE FUNCTION remove_workspace_member(
    p_ws_id uuid,
    p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify requesting user is admin/owner
    IF NOT EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_ws_id
          AND user_id = auth.uid()
          AND ws_role IN ('admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin of this workspace';
    END IF;
    
    -- Prevent removing the last owner
    IF (SELECT ws_role FROM ws_members WHERE ws_id = p_ws_id AND user_id = p_user_id) = 'owner' THEN
        IF (SELECT COUNT(*) FROM ws_members WHERE ws_id = p_ws_id AND ws_role = 'owner') <= 1 THEN
            RAISE EXCEPTION 'Cannot remove the last owner of a workspace';
        END IF;
    END IF;
    
    -- Remove member
    DELETE FROM ws_members
    WHERE ws_id = p_ws_id AND user_id = p_user_id;
    
    RETURN true;
END;
$$;

-- Function: Update a member's role in a workspace
CREATE OR REPLACE FUNCTION update_workspace_member_role(
    p_ws_id uuid,
    p_user_id uuid,
    p_new_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify requesting user is admin/owner
    IF NOT EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_ws_id
          AND user_id = auth.uid()
          AND ws_role IN ('admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin of this workspace';
    END IF;
    
    -- Prevent demoting the last owner
    IF (SELECT ws_role FROM ws_members WHERE ws_id = p_ws_id AND user_id = p_user_id) = 'owner' THEN
        IF (SELECT COUNT(*) FROM ws_members WHERE ws_id = p_ws_id AND ws_role = 'owner') <= 1 THEN
            IF p_new_role != 'owner' THEN
                RAISE EXCEPTION 'Cannot demote the last owner of a workspace';
            END IF;
        END IF;
    END IF;
    
    -- Update role
    UPDATE ws_members
    SET ws_role = p_new_role, updated_at = NOW()
    WHERE ws_id = p_ws_id AND user_id = p_user_id;
    
    RETURN true;
END;
$$;

-- ============================================================================
-- STEP 3: Verify functions exist with correct signatures
-- ============================================================================

SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_workspace',
    'update_workspace',
    'delete_workspace',
    'get_user_workspaces',
    'get_workspace_members',
    'add_workspace_member',
    'remove_workspace_member',
    'update_workspace_member_role'
  )
ORDER BY routine_name;

-- Verify parameter names (check function definitions)
SELECT 
    r.routine_name,
    p.parameter_name,
    p.data_type,
    p.ordinal_position
FROM information_schema.routines r
JOIN information_schema.parameters p ON p.specific_name = r.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name IN (
    'create_workspace',
    'update_workspace',
    'delete_workspace',
    'get_user_workspaces',
    'get_workspace_members',
    'add_workspace_member',
    'remove_workspace_member',
    'update_workspace_member_role'
  )
  AND p.parameter_mode = 'IN'
ORDER BY r.routine_name, p.ordinal_position;

-- Migration complete notice
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete: WS RPC functions now use p_ws_id parameter';
END $$;
