"""
Workspace module resource permission helpers.

This module provides workspace-specific permission checks that use the RPC functions
and database tables specific to module-ws.

Following ADR-019c pattern: Module-specific permissions live in module layers,
not in org-common (to avoid dependencies on optional modules).

Workspace module permission patterns:
- Ownership (user created the workspace)
- Membership (user is a workspace member)
- Admin role (user is a workspace admin)

Usage:
    from ws_common.permissions import can_view_ws, can_edit_ws
    
    if can_view_ws(user_id, ws_id):
        # User can view workspace
        ws = common.find_one('workspaces', {'id': ws_id})
    
    if can_edit_ws(user_id, ws_id):
        # User can edit workspace settings
        pass

See: docs/standards/03_std_back_RESOURCE-PERMISSIONS.md
"""

from typing import Optional, List, Dict, Any
from org_common import rpc


def is_ws_owner(user_id: str, ws_id: str) -> bool:
    """
    Check if user is the owner (creator) of a workspace.
    
    This is the most restrictive check - only the creator returns True.
    Use this for operations that should only be available to the owner,
    such as deleting the workspace or transferring ownership.
    
    Args:
        user_id: Supabase user UUID
        ws_id: Workspace UUID
        
    Returns:
        True if user created the workspace
        
    Example:
        >>> if is_ws_owner(user_id, ws_id):
        >>>     # Allow delete operation
        >>>     common.delete_one('workspaces', {'id': ws_id})
    """
    # ADR-019c: RPC function expects (p_user_id, p_ws_id) parameter order
    return rpc(function_name='is_ws_owner', params={
        'p_user_id': user_id,
        'p_ws_id': ws_id
    })


def can_view_ws(user_id: str, ws_id: str) -> bool:
    """
    Check if user has permission to view a workspace.
    
    Access granted if:
    - User is the owner (created_by = user_id)
    - User is a workspace member (workspace_members table)
    
    Admin roles do NOT provide automatic access.
    
    Args:
        user_id: Supabase user UUID
        ws_id: Workspace UUID
        
    Returns:
        True if user can view the workspace
        
    Example:
        >>> if can_view_ws(user_id, ws_id):
        >>>     ws = common.find_one('workspaces', {'id': ws_id})
        >>>     members = common.find_many('workspace_members', {'ws_id': ws_id})
    """
    # ADR-019c: RPC function expects (p_user_id, p_ws_id) parameter order
    return rpc(function_name='is_ws_member', params={
        'p_user_id': user_id,
        'p_ws_id': ws_id
    })


def can_edit_ws(user_id: str, ws_id: str) -> bool:
    """
    Check if user has permission to edit workspace settings.
    
    Access granted if:
    - User is the owner (created_by = user_id)
    - User is a workspace admin (ws_admin role)
    
    Note: Regular members do NOT have edit permission.
    Admin roles do NOT provide automatic access.
    
    Args:
        user_id: Supabase user UUID
        ws_id: Workspace UUID
        
    Returns:
        True if user can edit the workspace
        
    Example:
        >>> if can_edit_ws(user_id, ws_id):
        >>>     # Allow updating workspace settings
        >>>     common.update_one('workspaces', {'id': ws_id}, {
        >>>         'name': new_name,
        >>>         'description': new_description
        >>>     })
    """
    # ADR-019c: RPC function expects (p_user_id, p_ws_id) parameter order
    return rpc(function_name='is_ws_admin_or_owner', params={
        'p_user_id': user_id,
        'p_ws_id': ws_id
    })


def can_manage_ws(user_id: str, ws_id: str) -> bool:
    """
    Check if user has permission to manage workspace (add/remove members, change settings).
    
    Access granted if:
    - User is the owner (created_by = user_id)
    - User is a workspace admin (ws_admin role)
    
    This is the same as can_edit_ws but provided as an alias for clarity.
    
    Args:
        user_id: Supabase user UUID
        ws_id: Workspace UUID
        
    Returns:
        True if user can manage the workspace
        
    Example:
        >>> if can_manage_ws(user_id, ws_id):
        >>>     # Allow adding members
        >>>     common.insert_one('workspace_members', {
        >>>         'ws_id': ws_id,
        >>>         'user_id': new_member_id,
        >>>         'role': 'member'
        >>>     })
    """
    return can_edit_ws(user_id, ws_id)


def get_accessible_workspaces(
    user_id: str,
    org_id: str,
    favorites_only: bool = False,
    favorites_first: bool = False,
    status: str = 'active'
) -> List[Dict[str, Any]]:
    """
    Get all workspaces accessible to a user in an organization.
    
    Returns workspaces where user:
    - Is the owner
    - Is a member
    
    Args:
        user_id: Supabase user UUID
        org_id: Organization UUID
        favorites_only: Only return favorited workspaces
        favorites_first: Sort favorites to top
        status: Filter by status ('active', 'deleted', 'all')
        
    Returns:
        List of workspace records with user_role, is_favorited, and member_count
        
    Example:
        >>> # Get all workspaces user can access in org
        >>> workspaces = get_accessible_workspaces(user_id, org_id)
        >>> 
        >>> # Get only favorites
        >>> favorites = get_accessible_workspaces(user_id, org_id, favorites_only=True)
        >>> 
        >>> for ws in workspaces:
        >>>     print(f"{ws['name']} ({ws['user_role']}) - {ws['member_count']} members")
    """
    # Use existing get_ws_with_member_info RPC function
    result = rpc(function_name='get_ws_with_member_info', params={
        'p_org_id': org_id,
        'p_user_id': user_id,
        'p_favorites_only': favorites_only,
        'p_favorites_first': favorites_first,
        'p_status': status
    })
    return result if result else []


# Alias for consistency with other modules
def can_access_ws(user_id: str, ws_id: str) -> bool:
    """
    Alias for can_view_ws().
    
    Provided for consistency with other modules (chat, voice, eval).
    
    Args:
        user_id: Supabase user UUID
        ws_id: Workspace UUID
        
    Returns:
        True if user can view the workspace
    """
    return can_view_ws(user_id, ws_id)


# Export permission functions
__all__ = [
    'is_ws_owner',
    'can_view_ws',
    'can_edit_ws',
    'can_manage_ws',
    'can_access_ws',  # Alias
    'get_accessible_workspaces',
]