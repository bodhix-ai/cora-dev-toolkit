# Backend Standard: Resource Permission Authorization

**Standard ID:** 03_std_back_RESOURCE-PERMISSIONS  
**Category:** Backend - Authorization  
**Status:** Active  
**Decision:** [ADR-019c: Resource Permission Authorization](../arch%20decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md)  
**Validator:** `validation/api-tracer/` (resource permission checks)

---

## Overview

This standard defines **resource-level permission patterns** for CORA data routes (`/{module}/*`). While admin authorization (ADR-019a/b) controls access to module configuration, resource permissions control access to user data and resources.

**Two Authorization Layers:**

| Layer | Routes | Purpose | Standard |
|-------|--------|---------|----------|
| **Layer 1: Admin** | `/admin/*` | Module configuration | [03_std_back_AUTH.md](./03_std_back_AUTH.md) |
| **Layer 2: Resource** | `/{module}/*` | User data access | **THIS STANDARD** |

---

## Resource Permission Patterns

### Pattern A: Ownership Check

**Used for:** User-owned resources (chats, voice sessions, evaluations)

```python
def handle_get_chat_session(user_id: str, event: dict) -> dict:
    """Get chat session - ownership check"""
    session_id = extract_path_param(event, 'session_id')
    
    # 1. Fetch resource
    session = common.find_one('chat_sessions', {'id': session_id})
    if not session:
        return common.not_found_response('Session not found')
    
    # 2. Verify org membership (prevent cross-org access)
    if not common.call_rpc('is_org_member', {
        'p_org_id': session['org_id'],
        'p_user_id': user_id
    }):
        return common.forbidden_response('Not a member of this organization')
    
    # 3. Check resource permission
    if not can_access_chat(user_id, session_id):
        return common.forbidden_response('Access denied')
    
    return common.success_response(common.format_record(session))
```

### Pattern B: Membership Check

**Used for:** Org/workspace-scoped resources (list operations)

```python
def handle_list_chat_sessions(user_id: str, event: dict) -> dict:
    """List chat sessions - membership check"""
    query_params = event.get('queryStringParameters', {}) or {}
    
    # 1. Extract org_id from query params
    org_id = query_params.get('orgId')
    if not org_id:
        return common.bad_request_response('orgId query parameter is required')
    
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # 2. Verify org membership
    if not common.call_rpc('is_org_member', {
        'p_org_id': org_id,
        'p_user_id': user_id
    }):
        return common.forbidden_response('Not a member of this organization')
    
    # 3. List resources (filtered by ownership)
    sessions = common.find_many(
        'chat_sessions',
        filters={'org_id': org_id, 'created_by': user_id},
        order='created_at.desc'
    )
    
    return common.success_response(common.format_records(sessions))
```

### Pattern C: Sharing Check (Future)

**Used for:** Project-based or direct sharing

```python
def can_access_chat(user_id: str, session_id: str) -> bool:
    """
    Check if user can access chat (with sharing support).
    
    Access granted if:
    - User owns the chat
    - Chat is shared with user (future)
    - Chat is shared with user's project (future)
    """
    from org_common.db import call_rpc
    
    # Check ownership
    if call_rpc('is_chat_owner', {'p_user_id': user_id, 'p_session_id': session_id}):
        return True
    
    # TODO: Check sharing when implemented
    # if call_rpc('is_resource_shared_with', {
    #     'p_resource_type': 'chat',
    #     'p_resource_id': session_id,
    #     'p_user_id': user_id
    # }):
    #     return True
    
    return False
```

---

## Critical Rules

### ✅ ALWAYS: Verify Org Membership First

```python
# CORRECT order:
# 1. Fetch resource
resource = common.find_one('table', {'id': resource_id})

# 2. Verify org membership
if not call_rpc('is_org_member', {'p_org_id': resource['org_id'], 'p_user_id': user_id}):
    return common.forbidden_response('Not a member of this organization')

# 3. Check resource permission
if not can_access_resource(user_id, resource_id):
    return common.forbidden_response('Access denied')
```

**Why:** Prevents cross-org data leakage, even if resource permission check passes.

### ❌ NEVER: Admin Role Override

```python
# ❌ WRONG - do NOT check admin roles for resource access
def can_access_chat(user_id: str, session_id: str) -> bool:
    # Check ownership
    if call_rpc('is_chat_owner', {'p_user_id': user_id, 'p_session_id': session_id}):
        return True
    
    # ❌ WRONG - admin override violates least privilege
    # if call_rpc('is_org_admin', {'p_user_id': user_id, 'p_org_id': org_id}):
    #     return True
    
    return False
```

**Why:** Admin roles do NOT provide automatic access to user resources. Org owners must explicitly grant access.

### ✅ ALWAYS: Use `can_*` Permission Functions

```python
# ✅ CORRECT - use permission helper
if can_access_chat(user_id, session_id):
    # Allow access

# ❌ WRONG - inline ownership check
if call_rpc('is_chat_owner', {'p_user_id': user_id, 'p_session_id': session_id}):
    # This bypasses future sharing logic
```

**Why:** Permission functions may check multiple conditions (ownership + sharing). Inline checks bypass future enhancements.

---

## Core org-common Helpers (Always Available)

**CRITICAL:** Module-specific permission functions (chat, voice, eval) are in each module's backend layer, NOT in org-common. This prevents dependencies on optional modules.

### File: `org_common/resource_permissions.py`

```python
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
"""

from typing import Optional, Dict, Any
from .db import call_rpc, find_one

# ============================================================================
# CORE MEMBERSHIP CHECKS (Always Available)
# ============================================================================

def can_access_org_resource(user_id: str, org_id: str) -> bool:
    """Check if user can access org-scoped resource"""
    return call_rpc('is_org_member', {
        'p_org_id': org_id,
        'p_user_id': user_id
    })


def can_access_ws_resource(user_id: str, ws_id: str) -> bool:
    """Check if user can access workspace-scoped resource"""
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
```

## Module-Specific Permission Patterns

**Each functional module implements its own permission layer to avoid adding dependencies to org-common.**

### Pattern: Module Permission Layer

Create `permissions.py` in the module's backend layer:

```
module-chat/
└── backend/
    └── layers/
        └── chat_common/
            └── python/
                └── chat_common/
                    ├── __init__.py
                    └── permissions.py  # Chat-specific permissions
```

**Example:** `module-chat/backend/layers/chat_common/python/chat_common/permissions.py`

```python
"""
Chat module resource permission helpers.

Following ADR-019c pattern: Module-specific permissions live in module layers,
not in org-common (to avoid dependencies on optional modules).
"""

from typing import Optional, List, Dict, Any
from org_common.db import call_rpc


def can_view_chat(user_id: str, session_id: str) -> bool:
    """
    Check if user has permission to view a chat session.
    
    Access granted if:
    - User is the owner
    - User has a direct share
    - Chat is shared with workspace AND user is workspace member
    """
    return call_rpc('can_view_chat', {
        'p_user_id': user_id,
        'p_session_id': session_id
    })


def can_edit_chat(user_id: str, session_id: str) -> bool:
    """
    Check if user has permission to send messages in a chat session.
    
    Access granted if:
    - User is the owner
    - User has an edit share
    - Chat is shared with workspace AND user is workspace member
    
    Note: View-only shares do NOT grant edit permission.
    """
    return call_rpc('can_edit_chat', {
        'p_user_id': user_id,
        'p_session_id': session_id
    })
```

### Usage in Lambda

```python
from org_common.resource_permissions import can_access_chat

def handle_get_chat(user_id: str, event: dict) -> dict:
    session_id = extract_path_param(event, 'session_id')
    
    # Fetch resource
    session = common.find_one('chat_sessions', {'id': session_id})
    if not session:
        return common.not_found_response('Session not found')
    
    # Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        return common.forbidden_response('Not a member of this organization')
    
    # Check resource permission
    if not can_access_chat(user_id, session_id):
        return common.forbidden_response('Access denied')
    
    return common.success_response(common.format_record(session))
```

---

## Database RPC Functions

### Ownership Functions

```sql
-- Chat ownership
CREATE FUNCTION is_chat_owner(p_user_id UUID, p_session_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE id = p_session_id AND created_by = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Voice ownership
CREATE FUNCTION is_voice_owner(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM voice_sessions
    WHERE id = p_session_id AND created_by = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Eval ownership
CREATE FUNCTION is_eval_owner(p_user_id UUID, p_eval_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM evals
    WHERE id = p_eval_id AND created_by = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### Membership Functions

```sql
-- Org membership
CREATE FUNCTION is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id 
      AND person_id = p_user_id 
      AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Workspace membership
CREATE FUNCTION is_ws_member(p_ws_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM ws_members
    WHERE ws_id = p_ws_id 
      AND user_id = p_user_id 
      AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

### Assignment Functions

```sql
-- Voice assignee (e.g., transcriptionist)
CREATE FUNCTION is_voice_assignee(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM voice_session_assignments
    WHERE session_id = p_session_id 
      AND assignee_id = p_user_id
      AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Lambda Handler Pattern

### Complete Handler with Resource Permissions

```python
"""
Chat Sessions Lambda - Resource permission example
"""

import json
from typing import Dict, Any
import org_common as common
from org_common.resource_permissions import can_access_chat


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle chat session API requests"""
    print(json.dumps(event, default=str))
    
    try:
        # Extract user
        user_info = common.get_user_from_event(event)
        user_id = common.get_supabase_user_id_from_external_uid(user_info['user_id'])
        
        # Route to handlers
        http_method = event.get('httpMethod')
        path_params = event.get('pathParameters', {})
        
        if http_method == 'GET' and not path_params:
            # GET /chat/sessions?orgId={orgId} - list sessions
            return handle_list(user_id, event)
        
        elif http_method == 'GET' and path_params:
            # GET /chat/sessions/{session_id} - get single session
            return handle_get(user_id, event)
        
        elif http_method == 'PUT' and path_params:
            # PUT /chat/sessions/{session_id} - update session
            return handle_update(user_id, event)
        
        elif http_method == 'DELETE' and path_params:
            # DELETE /chat/sessions/{session_id} - delete session
            return handle_delete(user_id, event)
        
        else:
            return common.method_not_allowed_response()
    
    except common.ValidationError as e:
        return common.bad_request_response(str(e))
    except common.NotFoundError as e:
        return common.not_found_response(str(e))
    except common.ForbiddenError as e:
        return common.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return common.internal_error_response('Internal server error')


def handle_list(user_id: str, event: dict) -> dict:
    """List chat sessions (org-scoped, user-owned)"""
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Extract org_id
    org_id = query_params.get('orgId')
    if not org_id:
        return common.bad_request_response('orgId query parameter is required')
    
    org_id = common.validate_uuid(org_id, 'orgId')
    
    # Verify org membership
    if not common.can_access_org_resource(user_id, org_id):
        return common.forbidden_response('Not a member of this organization')
    
    # List user's sessions in this org
    sessions = common.find_many(
        'chat_sessions',
        filters={'org_id': org_id, 'created_by': user_id},
        order='created_at.desc'
    )
    
    return common.success_response(common.format_records(sessions))


def handle_get(user_id: str, event: dict) -> dict:
    """Get single chat session (ownership check)"""
    session_id = event['pathParameters']['session_id']
    session_id = common.validate_uuid(session_id, 'session_id')
    
    # Fetch resource
    session = common.find_one('chat_sessions', {'id': session_id})
    if not session:
        return common.not_found_response('Session not found')
    
    # Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        return common.forbidden_response('Not a member of this organization')
    
    # Check resource permission
    if not can_access_chat(user_id, session_id):
        return common.forbidden_response('Access denied')
    
    return common.success_response(common.format_record(session))


def handle_update(user_id: str, event: dict) -> dict:
    """Update chat session (ownership required)"""
    session_id = event['pathParameters']['session_id']
    session_id = common.validate_uuid(session_id, 'session_id')
    
    body = json.loads(event.get('body', '{}'))
    
    # Fetch resource
    session = common.find_one('chat_sessions', {'id': session_id})
    if not session:
        return common.not_found_response('Session not found')
    
    # Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        return common.forbidden_response('Not a member of this organization')
    
    # Check resource permission (must own to edit)
    if not can_access_chat(user_id, session_id):
        return common.forbidden_response('Access denied')
    
    # Update (only allow specific fields)
    allowed_fields = ['title', 'status', 'metadata']
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    update_data['updated_by'] = user_id
    
    updated = common.update_one(
        'chat_sessions',
        filters={'id': session_id},
        data=update_data
    )
    
    return common.success_response(common.format_record(updated))


def handle_delete(user_id: str, event: dict) -> dict:
    """Delete chat session (ownership required)"""
    session_id = event['pathParameters']['session_id']
    session_id = common.validate_uuid(session_id, 'session_id')
    
    # Fetch resource
    session = common.find_one('chat_sessions', {'id': session_id})
    if not session:
        return common.not_found_response('Session not found')
    
    # Verify org membership
    if not common.can_access_org_resource(user_id, session['org_id']):
        return common.forbidden_response('Not a member of this organization')
    
    # Check resource permission (must own to delete)
    if not can_access_chat(user_id, session_id):
        return common.forbidden_response('Access denied')
    
    # Delete
    common.delete_one('chat_sessions', filters={'id': session_id})
    
    return common.success_response({'message': 'Session deleted', 'id': session_id})
```

---

## Frontend Integration

Resource permission checks happen on the **backend**. Frontend patterns:

### API Route Structure

```
RESTful pattern (path-based IDs):
GET    /{module}/{resource}/{id}        - Get single resource
PUT    /{module}/{resource}/{id}        - Update resource
DELETE /{module}/{resource}/{id}        - Delete resource
GET    /{module}/{resource}?orgId={id}  - List resources (org-scoped)
POST   /{module}/{resource}             - Create resource
```

### Frontend API Client

```typescript
// API client for chat module
export function createChatClient(authAdapter: AuthAdapter) {
  return {
    // List (org-scoped)
    listSessions: async (orgId: string) => {
      const token = await authAdapter.getToken();
      return fetch(`/chat/sessions?orgId=${orgId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    
    // Get single (resource ID in path)
    getSession: async (sessionId: string) => {
      const token = await authAdapter.getToken();
      return fetch(`/chat/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    
    // Update
    updateSession: async (sessionId: string, data: Partial<Session>) => {
      const token = await authAdapter.getToken();
      return fetch(`/chat/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    },
    
    // Delete
    deleteSession: async (sessionId: string) => {
      const token = await authAdapter.getToken();
      return fetch(`/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  };
}
```

---

## Validation

Resource permission patterns are validated by `validation/api-tracer/auth_validator.py`:

```bash
# Run validation
python3 validation/api-tracer/cli.py validate \
  --path <stack-path> \
  --module <module-name> \
  --auth-only
```

**Checks:**
- Lambda uses `can_*` permission functions for resource routes
- Org/workspace membership verified before resource permission
- No admin role overrides
- RPC functions exist in database

---

## Migration Checklist

When adding resource permissions to existing modules:

- [ ] **Identify resource routes** - List all `/{module}/*` routes (non-admin)
- [ ] **Add RPC ownership functions** - `is_<resource>_owner(p_user_id, p_resource_id)`
- [ ] **Create `can_*` helpers** - In org_common or module-specific layer
- [ ] **Update Lambda handlers:**
  - [ ] Fetch resource
  - [ ] Verify org membership
  - [ ] Check resource permission
  - [ ] Return resource
- [ ] **Export helpers** - Add to `org_common/__init__.py` or module layer
- [ ] **Update frontend API client** - Path-based resource IDs
- [ ] **Run validator** - Verify compliance
- [ ] **Test permissions** - Verify cross-org access blocked

---

## Related Documents

- [ADR-019c: Resource Permission Authorization](../arch%20decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md) - Decision rationale
- [03_std_back_AUTH.md](./03_std_back_AUTH.md) - Admin authorization standard
- [ADR-019: CORA Authorization Standardization](../arch%20decisions/ADR-019-AUTH-STANDARDIZATION.md) - Parent ADR

---

**Status:** ✅ Active  
**Compliance:** Required for all CORA data routes  
**Validator:** `validation/api-tracer/` (resource permission checks)