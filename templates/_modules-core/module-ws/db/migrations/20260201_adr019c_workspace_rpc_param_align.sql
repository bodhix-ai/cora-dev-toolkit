-- =============================================
-- Migration: ADR-019c Workspace RPC Parameter Alignment
-- =============================================
-- Date: 2026-02-01
-- Purpose: Align workspace RPC functions to ADR-019c standard parameter order (user_id, resource_id)
-- Breaking Change: YES - Changes parameter names and order for several RPC functions
-- 
-- IMPORTANT: This migration drops and recreates functions with new parameter order.
-- Any code calling these functions must be updated BEFORE running this migration.
--
-- Functions affected:
-- - is_ws_member: (p_workspace_id, p_user_id) → (p_user_id, p_ws_id)
-- - is_ws_owner: (p_workspace_id, p_user_id) → (p_user_id, p_ws_id)
-- - is_ws_admin_or_owner: (p_workspace_id, p_user_id) → (p_user_id, p_ws_id)
-- - get_ws_role: (p_workspace_id, p_user_id) → (p_user_id, p_ws_id)
-- - toggle_ws_favorite: (p_workspace_id, p_user_id) → (p_user_id, p_ws_id)
-- - soft_delete_ws: (p_workspace_id, p_user_id) → (p_user_id, p_ws_id)
-- - restore_ws: (p_workspace_id, p_user_id) → (p_user_id, p_ws_id)

-- =============================================
-- Step 1: Drop functions with old signatures
-- =============================================

-- Drop helper functions
DROP FUNCTION IF EXISTS is_ws_member(UUID, UUID);
DROP FUNCTION IF EXISTS is_ws_owner(UUID, UUID);
DROP FUNCTION IF EXISTS is_ws_admin_or_owner(UUID, UUID);
DROP FUNCTION IF EXISTS get_ws_role(UUID, UUID);

-- Drop RPC functions that changed
DROP FUNCTION IF EXISTS toggle_ws_favorite(UUID, UUID);
DROP FUNCTION IF EXISTS soft_delete_ws(UUID, UUID);
DROP FUNCTION IF EXISTS restore_ws(UUID, UUID);

-- =============================================
-- Step 2: Create functions with new signatures (ADR-019c)
-- =============================================

-- Function: is_ws_member
-- ADR-019c: Parameter order aligned to standard (user_id, resource_id)
CREATE FUNCTION is_ws_member(
    p_user_id UUID,
    p_ws_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_ws_id
        AND user_id = p_user_id
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_ws_member(UUID, UUID) IS 
'Checks if user is an active member of the specified workspace. ADR-019c: (user_id, ws_id) parameter order';

-- Function: is_ws_owner
-- ADR-019c: Parameter order aligned to standard (user_id, resource_id)
CREATE FUNCTION is_ws_owner(
    p_user_id UUID,
    p_ws_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_ws_id
        AND user_id = p_user_id
        AND ws_role = 'ws_owner'
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_ws_owner(UUID, UUID) IS 
'Checks if user is an owner of the specified workspace. ADR-019c: (user_id, ws_id) parameter order';

-- Function: is_ws_admin_or_owner
-- ADR-019c: Parameter order aligned to standard (user_id, resource_id)
CREATE FUNCTION is_ws_admin_or_owner(
    p_user_id UUID,
    p_ws_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_ws_id
        AND user_id = p_user_id
        AND ws_role IN ('ws_owner', 'ws_admin')
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_ws_admin_or_owner(UUID, UUID) IS 
'Checks if user is an admin or owner of the specified workspace. ADR-019c: (user_id, ws_id) parameter order';

-- Function: get_ws_role
-- ADR-019c: Parameter order aligned to standard (user_id, resource_id)
CREATE FUNCTION get_ws_role(
    p_user_id UUID,
    p_ws_id UUID
) RETURNS VARCHAR(50) AS $$
DECLARE
    v_role VARCHAR(50);
BEGIN
    SELECT ws_role INTO v_role
    FROM ws_members
    WHERE ws_id = p_ws_id
    AND user_id = p_user_id
    AND deleted_at IS NULL;
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_ws_role(UUID, UUID) IS 
'Returns the role of a user in a workspace (ws_owner, ws_admin, ws_user) or NULL if not a member. ADR-019c: (user_id, ws_id) parameter order';

-- Function: toggle_ws_favorite
-- ADR-019c: Parameter order aligned to standard (user_id, resource_id)
CREATE FUNCTION toggle_ws_favorite(
    p_user_id UUID,
    p_ws_id UUID
) RETURNS JSON AS $$
DECLARE
    v_is_favorited BOOLEAN;
    v_favorited_at TIMESTAMPTZ;
BEGIN
    -- Verify user is workspace member (ADR-019c: user_id first)
    IF NOT is_ws_member(p_user_id, p_ws_id) THEN
        RAISE EXCEPTION 'User is not a member of this workspace';
    END IF;
    
    -- Check if already favorited
    SELECT EXISTS (
        SELECT 1 FROM ws_favorites
        WHERE ws_id = p_ws_id AND user_id = p_user_id
    ) INTO v_is_favorited;
    
    IF v_is_favorited THEN
        -- Remove favorite
        DELETE FROM ws_favorites
        WHERE ws_id = p_ws_id AND user_id = p_user_id;
        
        RETURN json_build_object(
            'workspace_id', p_ws_id,
            'is_favorited', false,
            'favorited_at', NULL
        );
    ELSE
        -- Add favorite
        INSERT INTO ws_favorites (ws_id, user_id)
        VALUES (p_ws_id, p_user_id)
        RETURNING created_at INTO v_favorited_at;
        
        RETURN json_build_object(
            'workspace_id', p_ws_id,
            'is_favorited', true,
            'favorited_at', v_favorited_at
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION toggle_ws_favorite(UUID, UUID) IS 
'Toggles favorite status for a workspace. Returns new state with is_favorited and favorited_at. ADR-019c: (user_id, ws_id) parameter order';

-- Function: soft_delete_ws
-- ADR-019c: Parameter order aligned to standard (user_id, resource_id)
CREATE FUNCTION soft_delete_ws(
    p_user_id UUID,
    p_ws_id UUID
) RETURNS JSON AS $$
DECLARE
    v_workspace workspaces%ROWTYPE;
BEGIN
    -- Verify user is owner (ADR-019c: user_id first)
    IF NOT is_ws_owner(p_user_id, p_ws_id) THEN
        RAISE EXCEPTION 'Only workspace owners can delete workspaces';
    END IF;
    
    -- Soft delete workspace
    UPDATE workspaces
    SET deleted_at = NOW(), deleted_by = p_user_id, status = 'deleted'
    WHERE id = p_ws_id
    RETURNING * INTO v_workspace;
    
    -- Soft delete all members
    UPDATE ws_members
    SET deleted_at = NOW()
    WHERE ws_id = p_ws_id;
    
    -- Remove all favorites
    DELETE FROM ws_favorites
    WHERE ws_id = p_ws_id;
    
    -- Return result
    RETURN json_build_object(
        'id', v_workspace.id,
        'deleted_at', v_workspace.deleted_at,
        'permanent_deletion_date', v_workspace.deleted_at + INTERVAL '1 day' * v_workspace.retention_days
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION soft_delete_ws(UUID, UUID) IS 
'Soft deletes a workspace, cascading to members and removing favorites. ADR-019c: (user_id, ws_id) parameter order';

-- Function: restore_ws
-- ADR-019c: Parameter order aligned to standard (user_id, resource_id)
CREATE FUNCTION restore_ws(
    p_user_id UUID,
    p_ws_id UUID
) RETURNS JSON AS $$
DECLARE
    v_workspace workspaces%ROWTYPE;
BEGIN
    -- Get workspace
    SELECT * INTO v_workspace FROM workspaces WHERE id = p_ws_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace not found';
    END IF;
    
    IF v_workspace.deleted_at IS NULL THEN
        RAISE EXCEPTION 'Workspace is not deleted';
    END IF;
    
    -- Verify user was an owner before deletion
    IF NOT EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_ws_id
        AND user_id = p_user_id
        AND ws_role = 'ws_owner'
    ) THEN
        RAISE EXCEPTION 'Only previous owners can restore workspaces';
    END IF;
    
    -- Restore workspace
    UPDATE workspaces
    SET deleted_at = NULL, deleted_by = NULL, status = 'active', updated_by = p_user_id, updated_at = NOW()
    WHERE id = p_ws_id
    RETURNING * INTO v_workspace;
    
    -- Restore all members
    UPDATE ws_members
    SET deleted_at = NULL
    WHERE ws_id = p_ws_id;
    
    RETURN row_to_json(v_workspace);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION restore_ws(UUID, UUID) IS 
'Restores a soft-deleted workspace and all its members. ADR-019c: (user_id, ws_id) parameter order';

-- =============================================
-- Migration Complete
-- =============================================
-- All workspace RPC functions now follow ADR-019c standard:
-- - Parameter order: (user_id, resource_id)
-- - Parameter names: p_user_id, p_ws_id
