# ADR-019c: Resource Permission Authorization Decision

**Status:** Approved  
**Date:** February 1, 2026  
**Parent ADR:** [ADR-019: CORA Authorization Standardization](./ADR-019-AUTH-STANDARDIZATION.md)  
**Standard:** [03_std_back_RESOURCE-PERMISSIONS.md](../standards/03_std_back_RESOURCE-PERMISSIONS.md)

---

## Overview

This document captures the **decision rationale** for CORA resource-level permission patterns. While ADR-019a/b cover admin authorization (`/admin/*` routes), this ADR addresses **data access authorization** for regular users accessing module resources.

### Authorization Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                   CORA Authorization Layers                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Admin Authorization (ADR-019a/b)                  │
│  ├─ Routes: /admin/sys/*, /admin/org/*, /admin/ws/*        │
│  ├─ Purpose: Module configuration and management            │
│  └─ Functions: check_sys_admin, check_org_admin, etc.      │
│                                                              │
│  Layer 2: Resource Permission (ADR-019c - THIS DOC)         │
│  ├─ Routes: /{module}/*                                     │
│  ├─ Purpose: User data access and operations                │
│  ├─ Functions: can_*, is_*_owner, is_*_member              │
│  └─ Patterns: Ownership, membership, sharing               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Decision Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Permission Model | Ownership + Membership + Sharing | Covers all access patterns |
| Function Naming | `can_*` for permissions, `is_*` for checks | Clear intent, consistent |
| Admin Override | **NO** automatic admin access | Owners must grant access explicitly |
| Scope Validation | Always verify org/ws membership | Prevent cross-org data leakage |
| Sharing Model | Direct + Project-based | Flexible collaboration |

---

## The Problem

CORA modules need consistent patterns for:
1. **Resource Ownership** - Who owns this chat/session/document?
2. **Membership Scoping** - Can user access this org's/workspace's data?
3. **Sharing & Collaboration** - Who else has access to this resource?
4. **Future Extensibility** - How to add new permission types?

**Without standardization:**
- 12+ different implementations of "can user access this chat"
- Inconsistent admin bypass behavior (some allow, some don't)
- Security gaps from incomplete permission checks
- Developer confusion about which pattern to use

---

## Key Decisions

### 1. Three Permission Patterns

**Decision:** Resource permissions follow three distinct patterns: Ownership, Membership, and Sharing.

#### Pattern A: Ownership Check
**Used for:** User-owned resources (chats, voice sessions, evaluations)

```python
# Database RPC
CREATE FUNCTION is_chat_owner(p_user_id UUID, p_session_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE id = p_session_id AND created_by = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

# Lambda helper
def can_access_chat(user_id: str, session_id: str) -> bool:
    """Check if user can access chat (owner or shared)"""
    from org_common.db import call_rpc
    
    # Check ownership
    if call_rpc('is_chat_owner', {'p_user_id': user_id, 'p_session_id': session_id}):
        return True
    
    # Check sharing (future)
    # if call_rpc('is_chat_shared_with', {'p_user_id': user_id, 'p_session_id': session_id}):
    #     return True
    
    return False
```

#### Pattern B: Membership Check
**Used for:** Org/workspace-scoped resources

```python
# Database RPC
CREATE FUNCTION is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id 
      AND person_id = p_user_id 
      AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

# Lambda helper
def can_access_org_resource(user_id: str, org_id: str) -> bool:
    """Check if user can access org-scoped resource"""
    from org_common.db import call_rpc
    return call_rpc('is_org_member', {'p_org_id': org_id, 'p_user_id': user_id})
```

#### Pattern C: Sharing Check (Future)
**Used for:** Project-based or direct sharing

```python
# Database RPC (future)
CREATE FUNCTION is_resource_shared_with(
    p_resource_type TEXT,
    p_resource_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM resource_shares
    WHERE resource_type = p_resource_type
      AND resource_id = p_resource_id
      AND (
        shared_with_user_id = p_user_id
        OR shared_with_project_id IN (
          SELECT project_id FROM project_members
          WHERE user_id = p_user_id AND active = true
        )
      )
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

**Why these patterns:**
- **Ownership** is simple, fast, covers 80% of use cases
- **Membership** prevents cross-org data leakage
- **Sharing** adds collaboration without complex ACLs
- All three are composable (OR conditions)

---

### 2. NO Admin Role Override

**Decision:** Admin roles (sys_admin, org_admin, ws_admin) do NOT automatically grant access to user resources.

**Why:**
- **Principle of Least Privilege**: Admins should not have carte blanche access to user data
- **Audit Trail**: Explicit permission grants create clear access records
- **Compliance**: Regulatory requirements often mandate explicit access grants
- **User Trust**: Users expect their chats/sessions are private by default

**Pattern:**
```python
def can_access_chat(user_id: str, session_id: str) -> bool:
    """
    Check if user can access chat.
    
    NOTE: Admin roles do NOT provide automatic access.
    Org owners must explicitly grant access if needed.
    """
    # Check ownership
    if is_chat_owner(user_id, session_id):
        return True
    
    # Check sharing (future)
    # if is_chat_shared_with(user_id, session_id):
    #     return True
    
    # NO admin override
    return False
```

**How admins access resources when needed:**
1. **Org Owner** can adjust sharing settings to grant access
2. **Transfer ownership** if needed for support/troubleshooting
3. **Workspace-level access** via workspace membership (not role bypass)

**Alternative Considered:** Admin role provides automatic override
- Rejected: Violates least privilege, creates compliance issues, erodes user trust

---

### 3. Scope Validation Before Permission Check

**Decision:** Always verify org/workspace membership BEFORE checking resource permissions.

**Why:**
- Prevents cross-org data leakage
- Enforces multi-tenant boundaries
- Catches data corruption (resource points to wrong org)

**Pattern:**
```python
def handle_get_chat(user_id: str, event: dict) -> dict:
    """Get chat session with proper scope validation"""
    session_id = extract_path_param(event, 'session_id')
    
    # 1. Get resource to find its org_id
    session = common.find_one('chat_sessions', {'id': session_id})
    if not session:
        return common.not_found_response('Chat not found')
    
    # 2. CRITICAL: Verify user is member of resource's org
    if not call_rpc('is_org_member', {
        'p_org_id': session['org_id'],
        'p_user_id': user_id
    }):
        return common.forbidden_response('Not a member of this organization')
    
    # 3. NOW check resource permission
    if not can_access_chat(user_id, session_id):
        return common.forbidden_response('Access denied')
    
    # 4. Return resource
    return common.success_response(session)
```

**Order matters:**
1. Fetch resource (to get org_id)
2. Verify org membership (prevent cross-org access)
3. Check resource permission (ownership/sharing)
4. Return resource

---

### 4. Consistent Function Naming

**Decision:** Use `can_*` for permission checks, `is_*` for boolean queries.

**Naming Conventions:**

| Pattern | Naming | Example |
|---------|--------|---------|
| Permission check (Python) | `can_<action>_<resource>` | `can_access_chat()`, `can_edit_kb()` |
| Ownership check (RPC) | `is_<resource>_owner` | `is_chat_owner()`, `is_voice_owner()` |
| Membership check (RPC) | `is_<scope>_member` | `is_org_member()`, `is_ws_member()` |
| Assignment check (RPC) | `is_<resource>_<role>` | `is_voice_assignee()` |

**Why:**
- `can_*` implies permission logic (may check multiple conditions)
- `is_*` implies simple boolean check
- Consistent with English grammar ("Can I access this?" vs "Am I the owner?")

---

### 5. Database RPC Functions (Existing)

**Decision:** Use existing RPC functions as building blocks for permission checks.

**Available Functions (from database):**

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| `is_chat_owner` | `p_user_id UUID, p_session_id UUID` | `BOOLEAN` | Chat ownership |
| `is_eval_owner` | `p_user_id UUID, p_eval_id UUID` | `BOOLEAN` | Eval ownership |
| `is_voice_owner` | `p_session_id UUID, p_user_id UUID` | `BOOLEAN` | Voice ownership |
| `is_voice_assignee` | `p_session_id UUID, p_user_id UUID` | `BOOLEAN` | Voice assignment |
| `is_org_member` | `p_org_id UUID, p_user_id UUID` | `BOOLEAN` | Org membership |
| `is_ws_member` | `p_ws_id UUID, p_user_id UUID` | `BOOLEAN` | Workspace membership |
| `is_ws_owner` | `p_ws_id UUID, p_user_id UUID` | `BOOLEAN` | Workspace ownership |

**Note:** `is_org_admin` and `is_sys_admin` are admin-level checks covered by ADR-019b.

---

## Implementation Patterns

### Lambda Pattern: Resource Access Handler

```python
def handle_get_resource(user_id: str, event: dict, resource_type: str) -> dict:
    """
    Standard pattern for resource access handler.
    
    Steps:
    1. Extract resource ID from path
    2. Fetch resource (to get org_id)
    3. Verify org membership
    4. Check resource permission
    5. Return resource
    """
    resource_id = extract_path_param(event, 'id')
    
    # Fetch resource
    resource = common.find_one(resource_type, {'id': resource_id})
    if not resource:
        return common.not_found_response(f'{resource_type} not found')
    
    # Verify org membership
    if not call_rpc('is_org_member', {
        'p_org_id': resource['org_id'],
        'p_user_id': user_id
    }):
        return common.forbidden_response('Not a member of this organization')
    
    # Check resource permission
    can_access_fn = PERMISSION_CHECKERS.get(resource_type)
    if not can_access_fn or not can_access_fn(user_id, resource_id):
        return common.forbidden_response('Access denied')
    
    return common.success_response(common.format_record(resource))


# Permission checker registry
PERMISSION_CHECKERS = {
    'chat_sessions': lambda user_id, id: can_access_chat(user_id, id),
    'voice_sessions': lambda user_id, id: can_access_voice(user_id, id),
    'evals': lambda user_id, id: can_access_eval(user_id, id),
}
```

### Python Helper: Composable Permission Check

**CRITICAL:** Module-specific permission functions live in each module's backend layer, NOT in org-common. This prevents dependencies on optional modules.

**Example:** `module-chat/backend/layers/chat_common/python/chat_common/permissions.py`

```python
"""
Chat module resource permission helpers.

Following ADR-019c: Module-specific permissions live in module layers,
not in org-common (to avoid dependencies on optional modules).
"""

from org_common.db import call_rpc


def can_access_chat(user_id: str, session_id: str) -> bool:
    """
    Check if user can access chat session.
    
    Access granted if:
    - User owns the chat (created_by = user_id)
    - Chat is shared with user (future)
    - Chat is shared with user's project (future)
    
    Admin roles do NOT provide automatic access.
    """
    # Check ownership
    if call_rpc('is_chat_owner', {'p_user_id': user_id, 'p_session_id': session_id}):
        return True
    
    # TODO: Add sharing checks when implemented
    # if call_rpc('is_chat_shared_with', {'p_user_id': user_id, 'p_session_id': session_id}):
    #     return True
    
    return False


def can_edit_chat(user_id: str, session_id: str) -> bool:
    """
    Check if user can send messages in chat session.
    
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

**Example:** `module-voice/backend/layers/voice_common/python/voice_common/permissions.py`

```python
"""Voice module resource permission helpers."""

from org_common.db import call_rpc


def can_access_voice(user_id: str, session_id: str) -> bool:
    """
    Check if user can access voice session.
    
    Access granted if:
    - User owns the voice session
    - User is assigned to the voice session (e.g., transcriptionist)
    """
    # Check ownership
    if call_rpc('is_voice_owner', {'p_session_id': session_id, 'p_user_id': user_id}):
        return True
    
    # Check assignment
    if call_rpc('is_voice_assignee', {'p_session_id': session_id, 'p_user_id': user_id}):
        return True
    
    return False
```

### org-common Helper Module (CORE Helpers Only)

**CRITICAL:** org-common provides only CORE permission helpers. Module-specific functions (chat, voice, eval) live in each module's backend layer.

**File:** `templates/_project-stack-template/org-common/python/org_common/resource_permissions.py`

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

Admin roles do NOT provide automatic access override.
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

### Module-Specific Permission Pattern

Each functional module implements its own permission layer:

**Directory Structure:**
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

**Usage in Lambda:**
```python
# Import from module's own layer
from chat_common.permissions import can_access_chat, can_edit_chat

def handle_get_chat(user_id: str, event: dict) -> dict:
    session_id = extract_path_param(event, 'session_id')
    
    # Fetch resource
    session = common.find_one('chat_sessions', {'id': session_id})
    if not session:
        return common.not_found_response('Session not found')
    
    # Verify org membership (from org-common)
    if not common.can_access_org_resource(user_id, session['org_id']):
        return common.forbidden_response('Not a member of this organization')
    
    # Check resource permission (from module layer)
    if not can_access_chat(user_id, session_id):
        return common.forbidden_response('Access denied')
    
    return common.success_response(common.format_record(session))
```

**Why module-specific layers:**
- org-common doesn't depend on optional modules
- New modules don't require org-common updates
- Each module controls its own permission logic

---

## Frontend Integration

Resource permission checks happen on the **backend**. The frontend:
1. Displays resources the user has access to (based on API response)
2. Does NOT enforce permission checks (backend is authoritative)
3. May hide UI elements based on ownership for UX (not security)

**Example:**
```typescript
// Frontend component - display resources
export function ChatList() {
  const { data: chats } = useChats(); // Backend filters to accessible chats
  
  return (
    <List>
      {chats.map(chat => (
        <ChatItem 
          key={chat.id} 
          chat={chat}
          // Show edit button only for owned chats (UX, not security)
          canEdit={chat.created_by === currentUser.id}
        />
      ))}
    </List>
  );
}
```

---

## Future: Sharing Implementation

When implementing resource sharing:

1. **Add sharing table:**
```sql
CREATE TABLE resource_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id),
    resource_type TEXT NOT NULL, -- 'chat', 'voice', 'eval', etc.
    resource_id UUID NOT NULL,
    
    -- Direct sharing
    shared_with_user_id UUID REFERENCES auth.users(id),
    
    -- Project-based sharing
    shared_with_project_id UUID REFERENCES projects(id),
    
    -- Permissions
    permission_level TEXT NOT NULL DEFAULT 'view', -- 'view', 'edit', 'admin'
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    CONSTRAINT share_target_check CHECK (
        (shared_with_user_id IS NOT NULL AND shared_with_project_id IS NULL) OR
        (shared_with_user_id IS NULL AND shared_with_project_id IS NOT NULL)
    )
);
```

2. **Add RPC function:**
```sql
CREATE FUNCTION is_resource_shared_with(
    p_resource_type TEXT,
    p_resource_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM resource_shares
    WHERE resource_type = p_resource_type
      AND resource_id = p_resource_id
      AND (
        -- Direct share
        shared_with_user_id = p_user_id
        OR
        -- Project share
        shared_with_project_id IN (
          SELECT project_id FROM project_members
          WHERE user_id = p_user_id AND active = true
        )
      )
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

3. **Update permission helpers:**
```python
def can_access_chat(user_id: str, session_id: str) -> bool:
    """Check if user can access chat (with sharing)"""
    # Check ownership
    if call_rpc('is_chat_owner', {'p_user_id': user_id, 'p_session_id': session_id}):
        return True
    
    # Check sharing
    if call_rpc('is_resource_shared_with', {
        'p_resource_type': 'chat',
        'p_resource_id': session_id,
        'p_user_id': user_id
    }):
        return True
    
    return False
```

---

## Validation

Resource permission patterns will be validated by extending the api-tracer validator:

```bash
# Run validation (future)
python3 validation/api-tracer/cli.py validate \
  --path <stack-path> \
  --module <module-name> \
  --resource-perms
```

**Checks:**
- Lambda uses `can_*` permission functions
- Org/workspace membership verified before resource permission
- No admin role overrides (unless explicitly documented exception)
- RPC functions exist and have correct parameters

---

## Migration Notes

### Adding Resource Permissions to Existing Modules

1. **Identify resource routes:**
   - `/{module}/sessions` - list user's sessions
   - `/{module}/sessions/{id}` - get specific session

2. **Add RPC ownership function (if not exists):**
```sql
CREATE FUNCTION is_<resource>_owner(p_user_id UUID, p_resource_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM <resource_table>
    WHERE id = p_resource_id AND created_by = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

3. **Add Python helper:**
```python
def can_access_<resource>(user_id: str, resource_id: str) -> bool:
    return call_rpc('is_<resource>_owner', {
        'p_user_id': user_id,
        'p_resource_id': resource_id
    })
```

4. **Update Lambda handler:**
```python
def handle_get(user_id: str, event: dict) -> dict:
    resource_id = extract_path_param(event, 'id')
    
    # Fetch resource
    resource = common.find_one('<resource_table>', {'id': resource_id})
    if not resource:
        return common.not_found_response('Resource not found')
    
    # Verify org membership
    if not call_rpc('is_org_member', {
        'p_org_id': resource['org_id'],
        'p_user_id': user_id
    }):
        return common.forbidden_response('Not a member of this organization')
    
    # Check resource permission
    if not can_access_<resource>(user_id, resource_id):
        return common.forbidden_response('Access denied')
    
    return common.success_response(common.format_record(resource))
```

---

## Related Documents

- [ADR-019: CORA Authorization Standardization](./ADR-019-AUTH-STANDARDIZATION.md) - Parent ADR
- [ADR-019a: Frontend Authorization](./ADR-019a-AUTH-FRONTEND.md) - Frontend auth patterns
- [ADR-019b: Backend Authorization](./ADR-019b-AUTH-BACKEND.md) - Backend admin auth patterns
- [03_std_back_AUTH.md](../standards/03_std_back_AUTH.md) - Backend auth standard

---

## Decision Rationale Summary

| Decision | Rationale |
|----------|-----------|
| Three permission patterns | Covers all access patterns (ownership, membership, sharing) |
| NO admin override | Least privilege, compliance, user trust |
| Scope validation first | Prevents cross-org data leakage |
| `can_*` / `is_*` naming | Clear intent, consistent with English |
| RPC building blocks | Reusable, consistent, testable |
| Backend-enforced | Frontend cannot be trusted for security |

---

**Status:** ✅ Approved  
**Parent:** ADR-019  
**Tracking:** Sprint S2 of Auth Standardization Initiative  
**Next Step:** Implement resource_permissions.py in org-common