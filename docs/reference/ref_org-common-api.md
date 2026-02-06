# org_common Module API Reference

**Purpose:** Quick reference for `org_common` module functions available to Lambda code  
**Location:** `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/`  
**Usage:** `import org_common as common` or `from org_common import function_name`

---

## 🚨 CRITICAL: Common Mistakes to Avoid

| ❌ WRONG | ✅ CORRECT | Notes |
|----------|-----------|-------|
| `call_rpc()` | `rpc()` | Function is just `rpc`, not `call_rpc` |
| `execute_rpc()` | `rpc()` | Same - use `rpc()` |
| `workspace_id` | `ws_id` | ADR-011 abbreviation standard |

---

## Database Functions (from `org_common.db`)

```python
from org_common import (
    # Query functions
    find_one,      # find_one(table, filters) -> dict | None
    find_many,     # find_many(table, filters, order_by=None, limit=None) -> list
    count,         # count(table, filters) -> int
    
    # Mutation functions
    insert_one,    # insert_one(table, data) -> dict
    update_one,    # update_one(table, filters, data) -> dict
    update_many,   # update_many(table, filters, data) -> list
    delete_one,    # delete_one(table, filters) -> bool
    delete_many,   # delete_many(table, filters) -> int
    
    # RPC function
    rpc,           # rpc(function_name, params) -> any  ⚠️ NOT call_rpc!
    
    # Low-level
    execute_query, # execute_query(query) -> result
    format_record, # format_record(record) -> dict
    format_records # format_records(records) -> list
)
```

### RPC Usage Example

```python
from org_common.db import rpc, find_one

# ✅ CORRECT - use rpc()
result = rpc('is_ws_member', {'p_ws_id': ws_id, 'p_user_id': user_id})

# ❌ WRONG - call_rpc doesn't exist!
# result = call_rpc('is_ws_member', {...})  
```

---

## Auth Functions (from `org_common.auth`)

```python
from org_common import (
    # Membership checks (existing - use for backward compatibility)
    is_org_member,     # is_org_member(org_id, user_id) -> bool
    is_org_admin,      # is_org_admin(org_id, user_id) -> bool
    is_org_owner,      # is_org_owner(org_id, user_id) -> bool
    is_org_colleague,  # is_org_colleague(org_id, user_id, target_user_id) -> bool
    
    # Project checks
    is_project_member,
    is_project_owner,
    is_project_admin_or_owner,
    is_project_colleague,
    is_project_favorited,
    
    # Chat checks
    is_chat_owner,
    is_chat_participant,
    
    # System checks
    is_sys_admin,      # is_sys_admin(user_id) -> bool
    is_provider_active,
)
```

---

## ADR-019 Admin Authorization Helpers (NEW)

```python
from org_common import (
    # Standardized admin checks (ADR-019)
    check_sys_admin,   # check_sys_admin(user_id) -> bool
    check_org_admin,   # check_org_admin(user_id, org_id) -> bool
    check_ws_admin,    # check_ws_admin(user_id, ws_id) -> bool
    
    # Resource access (ADR-019c)
    can_access_org_resource,  # can_access_org_resource(user_id, org_id) -> bool
)
```

---

## Auth Role Constants (ADR-019)

```python
from org_common import (
    SYS_ADMIN_ROLES,  # ['sys_owner', 'sys_admin']
    ORG_ADMIN_ROLES,  # ['org_owner', 'org_admin']
    WS_ADMIN_ROLES,   # ['ws_owner', 'ws_admin']
)
```

---

## Response Builders

```python
from org_common import (
    success_response,       # 200 OK
    created_response,       # 201 Created
    no_content_response,    # 204 No Content
    bad_request_response,   # 400 Bad Request
    unauthorized_response,  # 401 Unauthorized
    forbidden_response,     # 403 Forbidden
    not_found_response,     # 404 Not Found
    conflict_response,      # 409 Conflict
    internal_error_response,# 500 Internal Server Error
    method_not_allowed_response,  # 405 Method Not Allowed
    error_response,         # Generic error
)
```

---

## Validators

```python
from org_common import (
    validate_uuid,
    validate_email,
    validate_org_role,
    validate_sys_role,
    validate_string_length,
    validate_url,
    validate_required,
    validate_integer,
    validate_boolean,
    validate_choices,
)
```

---

## Transform Utilities

```python
from org_common import (
    snake_to_camel,
    camel_to_snake,
    transform_record,   # snake_case to camelCase for API responses
    transform_records,
    transform_input,    # camelCase to snake_case for DB writes
)
```

---

## User & JWT Utilities

```python
from org_common import (
    resolve_user_jwt,
    extract_jwt_from_headers,
    get_user_from_event,
    get_supabase_user_id_from_external_uid,  # Map Okta/Clerk UID to Supabase UUID
    get_org_context_from_event,              # Extract org_id from request
)
```

---

## Errors

```python
from org_common import (
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
)
```

---

## AI Operations

```python
from org_common import (
    log_ai_error,  # Log AI API errors for monitoring
)
```

---

**Last Updated:** February 6, 2026  
**See Also:** 
- ADR-019 (Auth Standardization)
- ADR-019c (Resource Permissions)
- ADR-011 (Database Naming Standards)