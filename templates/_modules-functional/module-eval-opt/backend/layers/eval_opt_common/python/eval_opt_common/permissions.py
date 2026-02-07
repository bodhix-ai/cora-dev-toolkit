"""
Eval Optimizer Resource Permission Helpers

Following ADR-019c: Module-specific permissions live in module layers,
not in org-common (to avoid dependencies on optional modules).

This module provides permission checks for:
- Optimization workspaces
- Optimization runs
- Document groups
- Truth keys

Function naming follows ADR-011 abbreviation conventions:
- ws = workspace
- opt = optimization
- doc = document

Admin roles do NOT provide automatic access override.
"""

from typing import Optional
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# WORKSPACE ACCESS (Optimization Workspaces)
# ============================================================================

def can_access_opt_ws(user_id: str, ws_id: str) -> bool:
    """
    Check if user can access an optimization workspace.

    Access granted if:
    - User is a member of the workspace (via ws_members)

    Note: This uses the standard workspace membership check.
    Admin roles do NOT provide automatic access.
    """
    try:
        import org_common as common

        # Check workspace membership (table is ws_members per ADR-011)
        member = common.find_one('ws_members', {
            'ws_id': ws_id,
            'user_id': user_id
        })
        return member is not None
    except Exception as e:
        logger.error(f"Error checking workspace access: {e}")
        return False


# ============================================================================
# RUN ACCESS (Optimization Runs)
# ============================================================================

def is_opt_run_owner(user_id: str, run_id: str) -> bool:
    """
    Check if user owns an optimization run.
    
    Ownership is determined by the created_by field.
    """
    try:
        import org_common as common
        
        run = common.find_one('eval_opt_runs', {'id': run_id})
        if not run:
            return False
        return run.get('created_by') == user_id
    except Exception as e:
        logger.error(f"Error checking run ownership: {e}")
        return False


def can_access_opt_run(user_id: str, run_id: str) -> bool:
    """
    Check if user can access an optimization run.
    
    Access granted if:
    - User is the run owner (created_by)
    - OR User is a member of the run's workspace
    
    Admin roles do NOT provide automatic access.
    """
    try:
        import org_common as common
        
        # Fetch run to get workspace ID
        run = common.find_one('eval_opt_runs', {'id': run_id})
        if not run:
            return False
        
        ws_id = run.get('ws_id')
        if not ws_id:
            # Fallback: check ownership only
            return is_opt_run_owner(user_id, run_id)
        
        # Check workspace membership (grants access to all runs in workspace)
        if can_access_opt_ws(user_id, ws_id):
            return True
        
        return False
    except Exception as e:
        logger.error(f"Error checking run access: {e}")
        return False


def can_manage_opt_run(user_id: str, run_id: str) -> bool:
    """
    Check if user can manage (cancel, delete) an optimization run.
    
    Management granted if:
    - User is the run owner (created_by)
    - OR User is a workspace admin/owner
    
    Regular workspace members can view but not manage runs they didn't create.
    Admin roles do NOT provide automatic access.
    """
    try:
        import org_common as common
        
        # Check ownership first (most common case)
        if is_opt_run_owner(user_id, run_id):
            return True
        
        # Fetch run to get workspace ID
        run = common.find_one('eval_opt_runs', {'id': run_id})
        if not run:
            return False
        
        ws_id = run.get('ws_id')
        if not ws_id:
            return False
        
        # Check if user is workspace owner (by checking ws_members with owner role)
        member = common.find_one('ws_members', {
            'ws_id': ws_id,
            'user_id': user_id,
            'role': 'owner'
        })
        if member:
            return True
        
        return False
    except Exception as e:
        logger.error(f"Error checking run management permission: {e}")
        return False


# ============================================================================
# DOCUMENT GROUP ACCESS
# ============================================================================

def can_access_opt_doc_group(user_id: str, group_id: str) -> bool:
    """
    Check if user can access a document group.
    
    Access granted if:
    - User is a member of the document group's workspace
    
    Admin roles do NOT provide automatic access.
    """
    try:
        import org_common as common
        
        # Fetch doc group to get workspace ID
        group = common.find_one('eval_opt_doc_groups', {'id': group_id})
        if not group:
            return False
        
        ws_id = group.get('ws_id')
        if not ws_id:
            return False
        
        return can_access_opt_ws(user_id, ws_id)
    except Exception as e:
        logger.error(f"Error checking doc group access: {e}")
        return False


# ============================================================================
# TRUTH KEY ACCESS
# ============================================================================

def can_access_opt_truth_key(user_id: str, truth_key_id: str) -> bool:
    """
    Check if user can access a truth key.
    
    Access granted if:
    - User can access the parent document group
    
    Admin roles do NOT provide automatic access.
    """
    try:
        import org_common as common
        
        # Fetch truth key to get doc group ID
        truth_key = common.find_one('eval_opt_truth_keys', {'id': truth_key_id})
        if not truth_key:
            return False
        
        group_id = truth_key.get('doc_group_id')
        if not group_id:
            return False
        
        return can_access_opt_doc_group(user_id, group_id)
    except Exception as e:
        logger.error(f"Error checking truth key access: {e}")
        return False


def can_edit_opt_truth_key(user_id: str, truth_key_id: str) -> bool:
    """
    Check if user can edit a truth key.
    
    Edit granted if:
    - User created the truth key (evaluated_by)
    - OR User is a workspace admin/owner
    
    Regular workspace members can view but not edit others' truth keys.
    """
    try:
        import org_common as common
        
        # Fetch truth key
        truth_key = common.find_one('eval_opt_truth_keys', {'id': truth_key_id})
        if not truth_key:
            return False
        
        # Check if user created this truth key
        if truth_key.get('evaluated_by') == user_id:
            return True
        
        # Get workspace ID through doc group
        group_id = truth_key.get('doc_group_id')
        if not group_id:
            return False
        
        group = common.find_one('eval_opt_doc_groups', {'id': group_id})
        if not group:
            return False
        
        ws_id = group.get('ws_id')
        if not ws_id:
            return False
        
        # Check if user is workspace owner (table is ws_members per ADR-011)
        member = common.find_one('ws_members', {
            'ws_id': ws_id,
            'user_id': user_id,
            'role': 'owner'
        })
        if member:
            return True
        
        return False
    except Exception as e:
        logger.error(f"Error checking truth key edit permission: {e}")
        return False
