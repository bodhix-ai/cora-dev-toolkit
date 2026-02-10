"""
Resource permission helpers for CORA modules.

This module provides CORE permission patterns that apply to all CORA modules.
Module-specific permission functions should be implemented in each module's
own backend layer (not here).

Core patterns (always available):
- Membership checks (org, workspace)
- Generic ownership checks
- Generic RPC permission checks

Module-specific patterns (in module layers):
- can_access_chat() → module-chat/backend/layers/chat_common/
- can_access_voice() → module-voice/backend/layers/voice_common/
- can_access_eval() → module-eval/backend/layers/eval_common/

This design ensures:
- org-common doesn't need updates for new modules
- Functional modules remain optional
- No references to tables that may not exist

See: docs/standards/03_std_back_RESOURCE-PERMISSIONS.md
"""

from typing import Optional, Dict, Any
from .db import call_rpc, find_one
# ============================================================================
# CORE MEMBERSHIP CHECKS (Always Available)
# ============================================================================

def can_access_org_resource(user_id: str, org_id: str) -> bool:
    """
    Check if user can access org-scoped resource.
    
    This is a membership check - verifies user is an active member of the organization.
    Use this for:
    - List operations: GET /module/resources?orgId={orgId}
    - Verifying org membership before resource permission check
    
    Args:
        user_id: Supabase user UUID
        org_id: Organization UUID
        
    Returns:
        True if user is an active member of the organization
        
    Example:
        >>> # List resources in org
        >>> if can_access_org_resource(user_id, org_id):
        >>>     resources = common.find_many('resources', {'org_id': org_id})
    """
    return call_rpc('is_org_member', {
        'p_org_id': org_id,
        'p_user_id': user_id
    })


def can_access_ws_resource(user_id: str, ws_id: str) -> bool:
    """
    Check if user can access workspace-scoped resource.
    
    This is a membership check - verifies user is an active member of the workspace.
    Use this for:
    - List operations: GET /module/resources?wsId={wsId}
    - Verifying workspace membership before resource permission check
    
    Args:
        user_id: Supabase user UUID
        ws_id: Workspace UUID
        
    Returns:
        True if user is an active member of the workspace
        
    Example:
        >>> # List resources in workspace
        >>> if can_access_ws_resource(user_id, ws_id):
        >>>     resources = common.find_many('ws_resources', {'ws_id': ws_id})
    """
    return call_rpc('is_ws_member', {
        'p_ws_id': ws_id,
        'p_user_id': user_id
    })


# ============================================================================
# GENERIC PERMISSION HELPERS (For New Modules)
# ============================================================================

def check_resource_ownership(
    user_id: str,
    table: str,
    resource_id: str,
    owner_column: str = 'created_by'
) -> bool:
    """
    Generic ownership check for any resource.
    
    Use this pattern when creating new modules that need ownership checks.
    
    Args:
        user_id: Supabase user UUID
        table: Database table name
        resource_id: Resource UUID
        owner_column: Column name for owner (default: 'created_by')
        
    Returns:
        True if user owns the resource
        
    Example:
        >>> # In module-docs Lambda
        >>> if check_resource_ownership(user_id, 'documents', doc_id):
        >>>     # User owns this document
        >>>     pass
    """
    resource = find_one(table, {'id': resource_id})
    if not resource:
        return False
    return resource.get(owner_column) == user_id


def check_rpc_permission(rpc_name: str, params: Dict[str, Any]) -> bool:
    """
    Generic RPC permission check.
    
    Use this when you have a custom RPC function for permission checking.
    
    Args:
        rpc_name: Name of the RPC function (e.g., 'is_document_owner')
        params: Parameters to pass to RPC (e.g., {'p_user_id': user_id, 'p_doc_id': doc_id})
        
    Returns:
        Result of RPC function call
        
    Example:
        >>> # In module-docs Lambda
        >>> if check_rpc_permission('is_document_owner', {
        >>>     'p_user_id': user_id,
        >>>     'p_doc_id': doc_id
        >>> }):
        >>>     # User owns this document
        >>>     pass
    """
    return call_rpc(rpc_name, params)


# Export core permission functions
__all__ = [
    # Core membership checks (always available)
    'can_access_org_resource',
    'can_access_ws_resource',
    
    # Generic helpers for new modules
    'check_resource_ownership',
    'check_rpc_permission',
]
