# CORA Standard: Lambda Authorization Patterns

**Status:** Active  
**Version:** 1.0  
**Last Updated:** January 11, 2026  
**Related Standards:** [API Patterns](./standard_API-PATTERNS.md), [CORA Frontend](./standard_CORA-FRONTEND.md)

---

## Overview

This document defines the standard patterns for implementing authorization in CORA Lambda functions. Following these patterns ensures consistent, secure, and maintainable authorization across all modules.

## The Two-Tier Identity System

CORA uses a **two-tier user identity architecture** that is critical to understand for proper authorization:

```
┌─────────────────────────────────────────────────────────────┐
│                   CORA Identity Architecture                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tier 1: External Identity (Okta/Clerk)                     │
│  ├─ JWT Token contains: external_uid (e.g., Okta user ID)   │
│  ├─ Available in: user_info from get_user_from_event()      │
│  └─ Does NOT contain: roles, permissions, profile data      │
│                                                              │
│  Tier 2: Internal Identity (Supabase)                       │
│  ├─ Database stores: user_id (Supabase auth.users ID)       │
│  ├─ user_profiles table contains: global_role, org roles    │
│  └─ Must query database to get authorization data           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Points

1. **JWT tokens contain ONLY the external identity provider's user ID** (Okta UID, Clerk ID)
2. **Roles and permissions are stored in the DATABASE** (user_profiles table)
3. **You MUST map external UID → Supabase user_id** before querying authorization data
4. **NEVER assume role information is in the JWT** - it's not

---

## Standard Authorization Pattern

### ✅ CORRECT Pattern (Platform Admin Check)

```python
def handle_admin_function(user_info: Dict[str, Any], body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Admin-only endpoint. Only platform_admin and platform_owner can access.
    """
    # Step 1: Extract external UID from JWT
    okta_uid = user_info['user_id']  # This is the Okta user ID
    
    # Step 2: Map to Supabase user_id
    supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
    
    # Step 3: Query database for user profile
    profile = common.find_one('user_profiles', {'user_id': supabase_user_id})
    
    # Step 4: Check authorization
    if not profile or profile.get('global_role') not in ['platform_admin', 'platform_owner']:
        raise common.ForbiddenError('Only platform administrators can access this resource')
    
    # ... rest of function logic
```

### ❌ INCORRECT Anti-Pattern

```python
def handle_admin_function_WRONG(user_info: Dict[str, Any], body: Dict[str, Any]) -> Dict[str, Any]:
    """
    ❌ WRONG: This will cause 403 errors for valid admins
    """
    # Anti-pattern: Trying to get role from JWT
    user_role = user_info.get('role', '').lower()  # ❌ role is not in JWT!
    if user_role not in ['platform_admin', 'platform_owner']:
        raise common.ForbiddenError('Only platform administrators can access this resource')
    
    # This code will ALWAYS fail because 'role' is not in user_info
```

---

## Authorization Patterns by Use Case

### 1. Platform Admin Authorization

**Use Case:** Platform-wide administrative functions (stats, system config, etc.)

**Roles Allowed:** `platform_admin`, `platform_owner`

```python
def handle_platform_admin_action(user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Platform admin only."""
    # Map external UID → Supabase user_id
    okta_uid = user_info['user_id']
    supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
    
    # Query user profile for global_role
    profile = common.find_one('user_profiles', {'user_id': supabase_user_id})
    if not profile or profile.get('global_role') not in ['platform_admin', 'platform_owner']:
        raise common.ForbiddenError('Platform admin access required')
    
    # ... implementation
```

### 2. Organization Admin Authorization

**Use Case:** Organization-level administrative functions

**Roles Allowed:** `org_admin`, `org_owner`, `platform_admin`, `platform_owner`

```python
def handle_org_admin_action(org_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Org admin or platform admin."""
    okta_uid = user_info['user_id']
    supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
    
    # Get user profile
    profile = common.find_one('user_profiles', {'user_id': supabase_user_id})
    if not profile:
        raise common.ForbiddenError('User profile not found')
    
    global_role = profile.get('global_role')
    
    # Platform admins have access to all orgs
    if global_role in ['platform_admin', 'platform_owner']:
        return  # Authorized
    
    # Check org membership and role
    org_member = common.find_one('org_members', {
        'org_id': org_id,
        'user_id': supabase_user_id
    })
    
    if not org_member or org_member.get('org_role') not in ['org_admin', 'org_owner']:
        raise common.ForbiddenError('Organization admin access required')
    
    # ... implementation
```

### 3. Organization Membership Authorization

**Use Case:** User must be a member of the organization

**Roles Allowed:** Any member of the organization

```python
def handle_org_member_action(org_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Any org member can access."""
    okta_uid = user_info['user_id']
    supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
    
    # Check org membership
    org_member = common.find_one('org_members', {
        'org_id': org_id,
        'user_id': supabase_user_id
    })
    
    if not org_member:
        raise common.ForbiddenError('You are not a member of this organization')
    
    # ... implementation
```

### 4. Resource Owner Authorization

**Use Case:** User must own the specific resource

```python
def handle_resource_update(resource_id: str, user_info: Dict[str, Any], body: Dict[str, Any]) -> Dict[str, Any]:
    """Resource owner only."""
    okta_uid = user_info['user_id']
    supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
    
    # Get resource
    resource = common.find_one('resources', {'id': resource_id})
    if not resource:
        raise common.NotFoundError('Resource not found')
    
    # Check ownership
    if resource.get('created_by') != supabase_user_id:
        raise common.ForbiddenError('Only the resource owner can update it')
    
    # ... implementation
```

### 5. Module-Specific Role Authorization

**Use Case:** Check module-specific roles (e.g., workspace roles)

```python
def handle_workspace_action(workspace_id: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Workspace owner or admin."""
    okta_uid = user_info['user_id']
    supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
    
    # Use RPC function for module-specific authorization
    is_authorized = common.rpc(
        function_name='is_workspace_admin_or_owner',
        params={'p_ws_id': workspace_id, 'p_user_id': supabase_user_id}
    )
    
    if not is_authorized:
        raise common.ForbiddenError('Workspace admin or owner access required')
    
    # ... implementation
```

---

## Helper Functions

### Standard User ID Mapping

```python
def get_supabase_user_id(user_info: Dict[str, Any]) -> str:
    """
    Standard helper to get Supabase user_id from JWT user_info.
    
    Args:
        user_info: User info from common.get_user_from_event(event)
    
    Returns:
        Supabase user_id (UUID string)
    """
    okta_uid = user_info['user_id']
    return common.get_supabase_user_id_from_external_uid(okta_uid)
```

### Checking Platform Admin

```python
def is_platform_admin(user_info: Dict[str, Any]) -> bool:
    """
    Check if user is a platform administrator.
    
    Args:
        user_info: User info from JWT
    
    Returns:
        True if platform admin, False otherwise
    """
    okta_uid = user_info['user_id']
    supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
    
    profile = common.find_one('user_profiles', {'user_id': supabase_user_id})
    return profile and profile.get('global_role') in ['platform_admin', 'platform_owner']
```

---

## Common Mistakes to Avoid

### Mistake 1: Checking Role in JWT

```python
# ❌ WRONG
user_role = user_info.get('role')  # role is not in JWT!
if user_role != 'admin':
    raise ForbiddenError()
```

**Why it fails:** The JWT token from Okta/Clerk does NOT contain role information.

**Fix:** Query the database for the user's profile and check the `global_role` field.

### Mistake 2: Using Okta UID to Query user_profiles

```python
# ❌ WRONG
okta_uid = user_info['user_id']
profile = common.find_one('user_profiles', {'user_id': okta_uid})  # Wrong ID!
```

**Why it fails:** `user_profiles.user_id` is the Supabase auth.users ID, not the Okta UID.

**Fix:** Map the Okta UID to Supabase user_id first using `get_supabase_user_id_from_external_uid()`.

### Mistake 3: Skipping Authorization Checks

```python
# ❌ WRONG
def handle_admin_function(user_info: Dict[str, Any]) -> Dict[str, Any]:
    # No authorization check!
    return get_all_users()  # Exposed to all authenticated users
```

**Why it fails:** Every authenticated user can access admin functions.

**Fix:** Always check authorization before performing sensitive operations.

### Mistake 4: Using Deprecated Helper Functions

```python
# ❌ WRONG
from local_helpers import get_supabase_user_id_from_okta_uid  # Deprecated!
```

**Why it fails:** Local helper functions may be outdated or inconsistent.

**Fix:** Use standard `common.get_supabase_user_id_from_external_uid()` from org_common.

---

## Lambda Handler Template

Here's a complete template for a Lambda with proper authorization:

```python
"""
Module Name - Lambda Function

This Lambda provides endpoints for [description].

Routes:
- GET /resource - List resources
- POST /resource - Create resource (admin only)
- GET /resource/{id} - Get resource details
- PUT /resource/{id} - Update resource (owner only)
- DELETE /resource/{id} - Delete resource (owner only)
"""

import json
import logging
import os
from typing import Any, Dict

import org_common as common

logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))


def lambda_handler(event: Dict[str, Any], context: object) -> Dict[str, Any]:
    """Main Lambda handler with route dispatcher."""
    try:
        # Extract route information
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        # Standard CORA auth extraction
        user_info = common.get_user_from_event(event)
        okta_uid = user_info['user_id']
        supabase_user_id = common.get_supabase_user_id_from_external_uid(okta_uid)
        
        # Route dispatcher
        if path == '/resource' and http_method == 'GET':
            return handle_list_resources(supabase_user_id, event)
        
        elif path == '/resource' and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return handle_create_resource(supabase_user_id, user_info, body)
        
        # ... more routes
        
        else:
            return common.not_found_response(f'Route not found: {http_method} {path}')
    
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    
    except Exception as e:
        logger.exception(f'Internal error: {str(e)}')
        return common.internal_error_response('Internal server error')


def handle_create_resource(
    user_id: str,
    user_info: Dict[str, Any],
    body: Dict[str, Any]
) -> Dict[str, Any]:
    """
    POST /resource
    
    Create a new resource. Admin only.
    """
    # Authorization: Platform admin only
    profile = common.find_one('user_profiles', {'user_id': user_id})
    if not profile or profile.get('global_role') not in ['platform_admin', 'platform_owner']:
        raise common.ForbiddenError('Platform admin access required')
    
    # Validation
    name = body.get('name')
    if not name:
        raise common.ValidationError('name is required')
    
    # Create resource
    resource = common.insert_one('resources', {
        'name': name,
        'created_by': user_id
    })
    
    return common.success_response({'resource': resource}, status_code=201)
```

---

## Testing Authorization

### Unit Test Example

```python
def test_admin_authorization():
    """Test that non-admins cannot access admin endpoints."""
    # Setup: Create a regular user (not admin)
    user_info = {
        'user_id': 'okta_user_123',
        'email': 'user@example.com'
    }
    
    # Mock the database to return a non-admin profile
    mock_profile = {
        'user_id': 'supabase_user_123',
        'global_role': 'org_member'  # Not admin
    }
    
    # Attempt to call admin function
    with pytest.raises(common.ForbiddenError):
        handle_admin_function(user_info)
    
    # Verify the error message
    assert "Platform admin access required" in str(excinfo.value)
```

---

## Checklist for Lambda Authorization

When implementing a new Lambda function, verify:

- [ ] User ID mapping: External UID → Supabase user_id
- [ ] Database query for user profile (not JWT)
- [ ] Proper role checks based on use case
- [ ] Appropriate error handling (403 for unauthorized)
- [ ] Authorization comments in code
- [ ] Unit tests for authorization logic
- [ ] Integration tests with different user roles
- [ ] Documentation of required roles in docstrings

---

## Summary

**Remember:**

1. **JWT tokens do NOT contain roles** - roles are in the database
2. **Always map external UID to Supabase user_id** before authorization checks
3. **Query user_profiles table** to get the user's `global_role`
4. **Use standard org_common functions** for consistency
5. **Document required roles** in function docstrings
6. **Test authorization** with different user roles

**The pattern is:**
```
JWT (external_uid) → map → Supabase user_id → query → user_profiles → check global_role
```

Following these patterns prevents 403 errors and ensures secure, maintainable authorization across all CORA modules.

---

## Related Documents

- [CORA API Patterns](./standard_API-PATTERNS.md) - API design standards
- [CORA Module Development](../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md) - Module development process
- [Module Integration Spec](./standard_module-integration-spec.md) - Module integration requirements
