-- =============================================
-- MODULE-WS: Workspace RPC Functions
-- =============================================
-- Purpose: Shared RPC functions for workspace operations that span multiple tables
-- Source: Created for CORA toolkit Dec 2025

-- =============================================
-- HELPER FUNCTIONS: Workspace Access Control
-- =============================================

-- Function: is_workspace_member
CREATE OR REPLACE FUNCTION is_workspace_member(
    p_ws_id UUID,
    p_user_id UUID
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

COMMENT ON FUNCTION is_workspace_member(UUID, UUID) IS 
'Checks if user is an active member of the specified workspace';

-- Function: is_workspace_owner
CREATE OR REPLACE FUNCTION is_workspace_owner(
    p_ws_id UUID,
    p_user_id UUID
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

COMMENT ON FUNCTION is_workspace_owner(UUID, UUID) IS 
'Checks if user is an owner of the specified workspace';

-- Function: is_workspace_admin_or_owner
CREATE OR REPLACE FUNCTION is_workspace_admin_or_owner(
    p_ws_id UUID,
    p_user_id UUID
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

COMMENT ON FUNCTION is_workspace_admin_or_owner(UUID, UUID) IS 
'Checks if user is an admin or owner of the specified workspace';

-- Function: get_workspace_role
CREATE OR REPLACE FUNCTION get_workspace_role(
    p_ws_id UUID,
    p_user_id UUID
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

COMMENT ON FUNCTION get_workspace_role(UUID, UUID) IS 
'Returns the role of a user in a workspace (ws_owner, ws_admin, ws_user) or NULL if not a member';

-- Function: count_workspace_owners
CREATE OR REPLACE FUNCTION count_workspace_owners(
    p_ws_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM ws_members
    WHERE ws_id = p_ws_id
    AND ws_role = 'ws_owner'
    AND deleted_at IS NULL;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION count_workspace_owners(UUID) IS 
'Returns the count of owners for a workspace (used to prevent removing last owner)';

-- =============================================
-- RPC FUNCTIONS: Workspace Operations
-- =============================================

-- Function: create_workspace_with_owner
CREATE OR REPLACE FUNCTION create_workspace_with_owner(
    p_org_id UUID,
    p_name VARCHAR(255),
    p_description TEXT,
    p_color VARCHAR(7),
    p_icon VARCHAR(50),
    p_tags TEXT[],
    p_owner_id UUID
) RETURNS JSON AS $$
DECLARE
    v_workspace workspaces%ROWTYPE;
BEGIN
    -- Insert workspace
    INSERT INTO workspaces (
        org_id, name, description, color, icon, tags, created_by
    ) VALUES (
        p_org_id, p_name, p_description, 
        COALESCE(p_color, '#1976d2'),
        COALESCE(p_icon, 'WorkspaceIcon'),
        COALESCE(p_tags, ARRAY[]::TEXT[]),
        p_owner_id
    ) RETURNING * INTO v_workspace;
    
    -- Add creator as owner
    INSERT INTO ws_members (ws_id, user_id, ws_role, created_by)
    VALUES (v_workspace.id, p_owner_id, 'ws_owner', p_owner_id);
    
    -- Return workspace as JSON
    RETURN row_to_json(v_workspace);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_workspace_with_owner(UUID, VARCHAR, TEXT, VARCHAR, VARCHAR, TEXT[], UUID) IS 
'Creates a new workspace and adds the creator as the owner in a single transaction';

-- Function: soft_delete_workspace
CREATE OR REPLACE FUNCTION soft_delete_workspace(
    p_workspace_id UUID,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_workspace workspaces%ROWTYPE;
BEGIN
    -- Verify user is owner
    IF NOT is_workspace_owner(p_workspace_id, p_user_id) THEN
        RAISE EXCEPTION 'Only workspace owners can delete workspaces';
    END IF;
    
    -- Soft delete workspace
    UPDATE workspaces
    SET deleted_at = NOW(), deleted_by = p_user_id
    WHERE id = p_workspace_id
    RETURNING * INTO v_workspace;
    
    -- Soft delete all members
    UPDATE ws_members
    SET deleted_at = NOW()
    WHERE ws_id = p_workspace_id;
    
    -- Remove all favorites
    DELETE FROM ws_favorites
    WHERE ws_id = p_workspace_id;
    
    -- Return result
    RETURN json_build_object(
        'id', v_workspace.id,
        'deleted_at', v_workspace.deleted_at,
        'permanent_deletion_date', v_workspace.deleted_at + INTERVAL '1 day' * v_workspace.retention_days
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION soft_delete_workspace(UUID, UUID) IS 
'Soft deletes a workspace, cascading to members and removing favorites';

-- Function: restore_workspace
CREATE OR REPLACE FUNCTION restore_workspace(
    p_workspace_id UUID,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_workspace workspaces%ROWTYPE;
BEGIN
    -- Get workspace
    SELECT * INTO v_workspace FROM workspaces WHERE id = p_workspace_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace not found';
    END IF;
    
    IF v_workspace.deleted_at IS NULL THEN
        RAISE EXCEPTION 'Workspace is not deleted';
    END IF;
    
    -- Verify user was an owner before deletion
    IF NOT EXISTS (
        SELECT 1 FROM ws_members
        WHERE ws_id = p_workspace_id
        AND user_id = p_user_id
        AND ws_role = 'ws_owner'
    ) THEN
        RAISE EXCEPTION 'Only previous owners can restore workspaces';
    END IF;
    
    -- Restore workspace
    UPDATE workspaces
    SET deleted_at = NULL, deleted_by = NULL, updated_by = p_user_id, updated_at = NOW()
    WHERE id = p_workspace_id
    RETURNING * INTO v_workspace;
    
    -- Restore all members
    UPDATE ws_members
    SET deleted_at = NULL
    WHERE ws_id = p_workspace_id;
    
    RETURN row_to_json(v_workspace);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION restore_workspace(UUID, UUID) IS 
'Restores a soft-deleted workspace and all its members';

-- Function: toggle_workspace_favorite
CREATE OR REPLACE FUNCTION toggle_workspace_favorite(
    p_workspace_id UUID,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_is_favorited BOOLEAN;
    v_favorited_at TIMESTAMPTZ;
BEGIN
    -- Verify user is workspace member
    IF NOT is_workspace_member(p_workspace_id, p_user_id) THEN
        RAISE EXCEPTION 'User is not a member of this workspace';
    END IF;
    
    -- Check if already favorited
    SELECT EXISTS (
        SELECT 1 FROM ws_favorites
        WHERE ws_id = p_workspace_id AND user_id = p_user_id
    ) INTO v_is_favorited;
    
    IF v_is_favorited THEN
        -- Remove favorite
        DELETE FROM ws_favorites
        WHERE ws_id = p_workspace_id AND user_id = p_user_id;
        
        RETURN json_build_object(
            'workspace_id', p_workspace_id,
            'is_favorited', false,
            'favorited_at', NULL
        );
    ELSE
        -- Add favorite
        INSERT INTO ws_favorites (ws_id, user_id)
        VALUES (p_workspace_id, p_user_id)
        RETURNING created_at INTO v_favorited_at;
        
        RETURN json_build_object(
            'workspace_id', p_workspace_id,
            'is_favorited', true,
            'favorited_at', v_favorited_at
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION toggle_workspace_favorite(UUID, UUID) IS 
'Toggles favorite status for a workspace. Returns new state with is_favorited and favorited_at';

-- Function: get_workspaces_with_member_info
CREATE OR REPLACE FUNCTION get_workspaces_with_member_info(
    p_org_id UUID,
    p_user_id UUID,
    p_favorites_only BOOLEAN DEFAULT FALSE,
    p_favorites_first BOOLEAN DEFAULT FALSE,
    p_status VARCHAR(50) DEFAULT 'active'
) RETURNS TABLE (
    id UUID,
    org_id UUID,
    name VARCHAR(255),
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(50),
    tags TEXT[],
    status VARCHAR(50),
    user_role VARCHAR(50),
    is_favorited BOOLEAN,
    favorited_at TIMESTAMPTZ,
    member_count BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.org_id,
        w.name,
        w.description,
        w.color,
        w.icon,
        w.tags,
        w.status,
        wm.ws_role AS user_role,
        (wf.ws_id IS NOT NULL) AS is_favorited,
        wf.created_at AS favorited_at,
        (SELECT COUNT(*) FROM ws_members WHERE ws_id = w.id AND deleted_at IS NULL) AS member_count,
        w.created_at,
        w.updated_at,
        w.created_by,
        w.updated_by
    FROM workspaces w
    INNER JOIN ws_members wm ON w.id = wm.ws_id 
        AND wm.user_id = p_user_id 
        AND wm.deleted_at IS NULL
    LEFT JOIN ws_favorites wf ON w.id = wf.ws_id AND wf.user_id = p_user_id
    WHERE w.org_id = p_org_id
        AND w.deleted_at IS NULL
        AND (p_status = 'all' OR w.status = p_status)
        AND (NOT p_favorites_only OR wf.ws_id IS NOT NULL)
    ORDER BY
        CASE WHEN p_favorites_first THEN (wf.ws_id IS NOT NULL)::int ELSE 0 END DESC,
        w.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_workspaces_with_member_info(UUID, UUID, BOOLEAN, BOOLEAN, VARCHAR) IS 
'Returns workspaces with member role, favorite status, and member count for the current user';

-- =============================================
-- CLEANUP FUNCTION: Permanent Deletion
-- =============================================

-- Function: cleanup_expired_workspaces
CREATE OR REPLACE FUNCTION cleanup_expired_workspaces()
RETURNS TABLE (
    deleted_count INTEGER,
    workspace_ids UUID[]
) AS $$
DECLARE
    v_deleted_ids UUID[];
    v_count INTEGER;
BEGIN
    -- Find expired workspaces
    SELECT ARRAY_AGG(id) INTO v_deleted_ids
    FROM workspaces
    WHERE deleted_at IS NOT NULL
    AND deleted_at + INTERVAL '1 day' * retention_days < NOW();
    
    -- Permanently delete (cascades to ws_members via FK)
    DELETE FROM workspaces
    WHERE id = ANY(v_deleted_ids);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_count, COALESCE(v_deleted_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_workspaces() IS 
'Permanently deletes soft-deleted workspaces that have exceeded their retention period. 
Should be run daily via scheduled job (e.g., AWS EventBridge + Lambda).';
