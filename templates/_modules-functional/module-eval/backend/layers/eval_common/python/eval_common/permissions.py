"""
Evaluation module resource permission helpers.

This module provides evaluation-specific permission checks that use the RPC functions
and database tables specific to module-eval.

Following ADR-019c pattern: Module-specific permissions live in module layers,
not in org-common (to avoid dependencies on optional modules).

Evaluation module supports multiple access patterns:
- Ownership (user created the evaluation)
- Direct sharing (eval_shares table)
- Workspace sharing (is_shared_with_workspace flag)

Usage:
    from eval_common.permissions import can_view_eval, can_run_eval
    
    if can_view_eval(user_id, eval_id):
        # User can view evaluation results
        eval = common.find_one('evaluations', {'id': eval_id})
    
    if can_run_eval(user_id, eval_id):
        # User can execute evaluation
        pass

See: docs/standards/03_std_back_RESOURCE-PERMISSIONS.md
"""

from typing import Optional, List, Dict, Any
from org_common.db import call_rpc


def is_eval_owner(user_id: str, eval_id: str) -> bool:
    """
    Check if user is the owner (creator) of an evaluation.
    
    This is the most restrictive check - only the creator returns True.
    Use this for operations that should only be available to the owner,
    such as deleting the evaluation or changing sharing settings.
    
    Args:
        user_id: Supabase user UUID
        eval_id: Evaluation UUID
        
    Returns:
        True if user created the evaluation
        
    Example:
        >>> if is_eval_owner(user_id, eval_id):
        >>>     # Allow delete operation
        >>>     common.delete_one('evaluations', {'id': eval_id})
    """
    return call_rpc('is_eval_owner', {
        'p_user_id': user_id,
        'p_eval_id': eval_id
    })


def can_view_eval(user_id: str, eval_id: str) -> bool:
    """
    Check if user has permission to view an evaluation.
    
    Access granted if:
    - User is the owner (created_by = user_id)
    - User has a direct share (eval_shares table, any permission level)
    - Evaluation is shared with workspace AND user is workspace member
    
    Admin roles do NOT provide automatic access.
    
    Args:
        user_id: Supabase user UUID
        eval_id: Evaluation UUID
        
    Returns:
        True if user can view the evaluation
        
    Example:
        >>> if can_view_eval(user_id, eval_id):
        >>>     eval = common.find_one('evaluations', {'id': eval_id})
        >>>     results = common.find_many('eval_results', {'eval_id': eval_id})
    """
    return call_rpc('can_view_eval', {
        'p_user_id': user_id,
        'p_eval_id': eval_id
    })


def can_edit_eval(user_id: str, eval_id: str) -> bool:
    """
    Check if user has permission to edit an evaluation.
    
    Access granted if:
    - User is the owner (created_by = user_id)
    - User has an edit share (eval_shares table, permission_level = 'edit')
    
    Note: View-only shares do NOT grant edit permission.
    Workspace sharing does NOT grant edit permission.
    Admin roles do NOT provide automatic access.
    
    Args:
        user_id: Supabase user UUID
        eval_id: Evaluation UUID
        
    Returns:
        True if user can edit the evaluation
        
    Example:
        >>> if can_edit_eval(user_id, eval_id):
        >>>     # Allow updating evaluation config
        >>>     common.update_one('evaluations', {'id': eval_id}, {
        >>>         'name': new_name,
        >>>         'description': new_description
        >>>     })
    """
    return call_rpc('can_edit_eval', {
        'p_user_id': user_id,
        'p_eval_id': eval_id
    })


def can_run_eval(user_id: str, eval_id: str) -> bool:
    """
    Check if user has permission to run an evaluation.
    
    Access granted if:
    - User is the owner (created_by = user_id)
    - User has an edit share (eval_shares table, permission_level = 'edit')
    - Evaluation is shared with workspace AND user is workspace member
    
    Note: View-only shares do NOT grant run permission.
    Admin roles do NOT provide automatic access.
    
    Args:
        user_id: Supabase user UUID
        eval_id: Evaluation UUID
        
    Returns:
        True if user can run the evaluation
        
    Example:
        >>> if can_run_eval(user_id, eval_id):
        >>>     # Allow starting evaluation run
        >>>     common.insert_one('eval_runs', {
        >>>         'eval_id': eval_id,
        >>>         'started_by': user_id,
        >>>         'status': 'running'
        >>>     })
    """
    return call_rpc('can_run_eval', {
        'p_user_id': user_id,
        'p_eval_id': eval_id
    })


def get_accessible_evals(
    user_id: str,
    org_id: str,
    ws_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get all evaluations accessible to a user.
    
    Returns evaluations where user:
    - Is the owner
    - Has a direct share
    - Is a workspace member (for workspace-shared evaluations)
    
    Optionally filtered by workspace.
    
    Args:
        user_id: Supabase user UUID
        org_id: Organization UUID
        ws_id: Optional workspace UUID to filter by
        
    Returns:
        List of evaluation records with access_type indicator:
        - 'owner': User created the evaluation
        - 'shared': User has direct share
        - 'workspace': User accesses via workspace membership
        
    Example:
        >>> # Get all evaluations user can access in org
        >>> evals = get_accessible_evals(user_id, org_id)
        >>> 
        >>> # Get evaluations in specific workspace
        >>> workspace_evals = get_accessible_evals(user_id, org_id, ws_id)
        >>> 
        >>> for eval in evals:
        >>>     print(f"{eval['name']} ({eval['access_type']})")
    """
    result = call_rpc('get_accessible_evals', {
        'p_user_id': user_id,
        'p_org_id': org_id,
        'p_ws_id': ws_id
    })
    return result if result else []


# Alias for backwards compatibility and consistency with other modules
def can_access_eval(user_id: str, eval_id: str) -> bool:
    """
    Alias for can_view_eval().
    
    Provided for consistency with other modules (chat, voice, kb).
    
    Args:
        user_id: Supabase user UUID
        eval_id: Evaluation UUID
        
    Returns:
        True if user can view the evaluation
    """
    return can_view_eval(user_id, eval_id)


# Export permission functions
__all__ = [
    'is_eval_owner',
    'can_view_eval',
    'can_edit_eval',
    'can_run_eval',
    'can_access_eval',  # Alias
    'get_accessible_evals',
]