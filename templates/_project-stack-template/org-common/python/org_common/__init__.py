"""
org_common - Common utilities for CORA modules

This package provides CORE functionality for all CORA modules, including:
- Database operations (db.py)
- Core resource permissions (resource_permissions.py)
- Response formatting
- Validation helpers
- Error classes

Module-specific permissions are in each module's backend layer.

Usage:
    import org_common as common
    
    # Core membership checks (always available)
    if common.can_access_org_resource(user_id, org_id):
        # User is org member
        pass
    
    # Generic ownership check (for new modules)
    if common.check_resource_ownership(user_id, 'table', resource_id):
        # User owns resource
        pass
    
    # Module-specific permissions (in module layers)
    # from chat_common.permissions import can_access_chat
    # if can_access_chat(user_id, session_id):
    #     # User can access chat
    #     pass
"""

# Import core resource permission helpers
from .resource_permissions import (
    can_access_org_resource,
    can_access_ws_resource,
    check_resource_ownership,
    check_rpc_permission,
)

# Export core permission functions
__all__ = [
    # Core membership checks (always available)
    'can_access_org_resource',
    'can_access_ws_resource',
    
    # Generic helpers for new modules
    'check_resource_ownership',
    'check_rpc_permission',
]
