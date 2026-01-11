-- =============================================
-- MODULE-WS: Transfer Ownership RPC Function
-- =============================================
-- Purpose: Safely transfer workspace ownership with proper validation
-- Source: Created for CORA toolkit Jan 2026

-- =============================================
-- RPC FUNCTION: transfer_workspace_ownership
-- =============================================

CREATE OR REPLACE FUNCTION transfer_workspace_ownership(
    p_ws_id UUID,
    p_new_owner_id UUID,
    p_requester_id UUID
) RETURNS JSON AS $$
DECLARE
    v_workspace workspaces%ROWTYPE;
    v_new_owner_member ws_members%ROWTYPE;
    v_current_owners RECORD;
BEGIN
    -- Get workspace
    SELECT * INTO v_workspace FROM workspaces 
    WHERE id = p_ws_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace not found';
    END IF;
    
    -- Verify new owner is in the same organization
    IF NOT EXISTS (
        SELECT 1 FROM org_members
        WHERE org_id = v_workspace.org_id
        AND user_id = p_new_owner_id
    ) THEN
        RAISE EXCEPTION 'New owner must be a member of the organization';
    END IF;
    
    -- Check if new owner is already a member
    SELECT * INTO v_new_owner_member
    FROM ws_members
    WHERE ws_id = p_ws_id
    AND user_id = p_new_owner_id
    AND deleted_at IS NULL;
    
    IF FOUND THEN
        -- Update existing member to owner
        UPDATE ws_members
        SET ws_role = 'ws_owner',
            updated_by = p_requester_id,
            updated_at = NOW()
        WHERE id = v_new_owner_member.id;
    ELSE
        -- Add new owner as member
        INSERT INTO ws_members (ws_id, user_id, ws_role, created_by)
        VALUES (p_ws_id, p_new_owner_id, 'ws_owner', p_requester_id);
    END IF;
    
    -- Demote all previous owners to admin
    UPDATE ws_members
    SET ws_role = 'ws_admin',
        updated_by = p_requester_id,
        updated_at = NOW()
    WHERE ws_id = p_ws_id
    AND ws_role = 'ws_owner'
    AND user_id != p_new_owner_id
    AND deleted_at IS NULL;
    
    -- Update workspace updated_by and updated_at
    UPDATE workspaces
    SET updated_by = p_requester_id,
        updated_at = NOW()
    WHERE id = p_ws_id;
    
    -- Return success
    RETURN json_build_object(
        'workspace_id', p_ws_id,
        'new_owner_id', p_new_owner_id,
        'transferred_by', p_requester_id,
        'transferred_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION transfer_workspace_ownership(UUID, UUID, UUID) IS 
'Transfers workspace ownership to a new user. The new owner must be an org member. 
All previous owners are demoted to ws_admin role. Can be called by org admins or platform admins.';

-- =============================================
-- USAGE EXAMPLE
-- =============================================

-- Transfer ownership of workspace to a new user:
-- SELECT transfer_workspace_ownership(
--     'workspace-uuid',
--     'new-owner-user-uuid',
--     'requester-user-uuid'
-- );

-- Expected result:
-- {
--   "workspace_id": "workspace-uuid",
--   "new_owner_id": "new-owner-user-uuid",
--   "transferred_by": "requester-user-uuid",
--   "transferred_at": "2026-01-11T14:10:00Z"
-- }
