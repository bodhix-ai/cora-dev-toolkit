# Standard: RPC Function Standards

**Type:** Backend - Database  
**Scope:** All Supabase RPC functions and Python code calling them  
**ADR:** [ADR-020: RPC Function Standards](../arch%20decisions/ADR-020-RPC-PARAMETER-NAMING.md)  
**Status:** Active  

---

## Overview

This standard defines how to properly implement Supabase RPC functions in CORA applications, covering parameter naming, function naming, schema organization, and Python helper function deployment.

---

## 1. Parameter Naming Standard

### Required Pattern: p_ Prefix

**ALL** RPC function parameters MUST use the `p_` prefix.

### SQL Function Definition

```sql
-- ✅ CORRECT
CREATE FUNCTION is_org_admin(
    p_user_id UUID,
    p_org_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_members
        WHERE user_id = p_user_id
          AND org_id = p_org_id
          AND org_role IN ('org_owner', 'org_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```sql
-- ❌ WRONG - Missing p_ prefix
CREATE FUNCTION is_org_admin(
    user_id UUID,
    org_id UUID
) RETURNS BOOLEAN;
```

### Python RPC Call

```python
# ✅ CORRECT - Matches SQL signature
result = common.rpc('is_org_admin', {
    'p_user_id': user_id,
    'p_org_id': org_id
})

# ❌ WRONG - No p_ prefix
result = common.rpc('is_org_admin', {
    'user_id': user_id,
    'org_id': org_id
})
```

### Why This Matters

Supabase RPC requires **exact parameter name matching**:
- No type coercion
- No automatic mapping
- Wrong name = `function not found` error

---

## 2. Function Naming Standard

### Required Patterns

| Pattern | Use Case | Returns | Example |
|---------|----------|---------|---------|
| `is_*` | Membership/role checks | `BOOLEAN` | `is_sys_admin`, `is_org_member` |
| `can_*` | Permission checks | `BOOLEAN` | `can_access_resource`, `can_edit_eval` |
| `get_*` | Data retrieval | `TABLE/JSONB/type` | `get_user_orgs`, `get_eval_config` |
| `create_*` | Insert operations | `UUID` (new ID) | `create_evaluation` |
| `update_*` | Update operations | `BOOLEAN/VOID` | `update_workspace` |
| `delete_*` | Delete operations | `BOOLEAN/VOID` | `delete_evaluation` |

### Examples

```sql
-- ✅ CORRECT: Boolean membership checks use is_*
CREATE FUNCTION is_sys_admin(p_user_id UUID) RETURNS BOOLEAN;
CREATE FUNCTION is_org_member(p_user_id UUID, p_org_id UUID) RETURNS BOOLEAN;

-- ✅ CORRECT: Permission checks use can_*
CREATE FUNCTION can_access_workspace(p_user_id UUID, p_ws_id UUID) RETURNS BOOLEAN;
CREATE FUNCTION can_edit_evaluation(p_user_id UUID, p_eval_id UUID) RETURNS BOOLEAN;

-- ✅ CORRECT: Data retrieval uses get_*
CREATE FUNCTION get_user_workspaces(p_user_id UUID) RETURNS TABLE(...);
CREATE FUNCTION get_eval_results(p_eval_id UUID) RETURNS JSONB;

-- ❌ WRONG: Don't use check_*
CREATE FUNCTION check_sys_admin(p_user_id UUID) RETURNS BOOLEAN;

-- ❌ WRONG: Don't use validate_*
CREATE FUNCTION validate_org_membership(p_user_id UUID) RETURNS BOOLEAN;
```

---

## 3. Schema Organization Standard

### Required Directory Structure

```
module-{name}/
├── db/
│   ├── schema/
│   │   ├── 001-tables.sql          -- Table definitions only
│   │   ├── 002-tables-rpc.sql      -- Table operation functions (get_*, create_*, update_*)
│   │   ├── 003-auth-rpc.sql        -- Auth/permission functions (is_*, can_*)
│   │   └── 004-rls.sql             -- RLS policies (references RPC functions)
│   └── migrations/
│       └── {timestamp}_{description}.sql
```

### File Contents

#### 001-tables.sql

**Only table definitions:**

```sql
-- Table definitions only
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE eval_doc_summaries (
    evaluation_id UUID REFERENCES evaluations(id),
    document_id UUID NOT NULL,
    summary TEXT
);
```

#### 002-tables-rpc.sql

**Table operation functions (CRUD):**

```sql
-- Data retrieval functions
CREATE FUNCTION get_evaluation(p_eval_id UUID) 
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT row_to_json(e)
        FROM evaluations e
        WHERE id = p_eval_id
    );
END;
$$ LANGUAGE plpgsql;

-- Create functions
CREATE FUNCTION create_evaluation(
    p_user_id UUID,
    p_config JSONB
) RETURNS UUID AS $$
DECLARE
    v_eval_id UUID;
BEGIN
    INSERT INTO evaluations (user_id, config)
    VALUES (p_user_id, p_config)
    RETURNING id INTO v_eval_id;
    
    RETURN v_eval_id;
END;
$$ LANGUAGE plpgsql;

-- Update functions
CREATE FUNCTION update_eval_status(
    p_eval_id UUID,
    p_status TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE evaluations
    SET status = p_status
    WHERE id = p_eval_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Delete functions
CREATE FUNCTION delete_evaluation(
    p_user_id UUID,
    p_eval_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM evaluations
    WHERE id = p_eval_id
      AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

#### 003-auth-rpc.sql

**Auth and permission functions:**

```sql
-- Membership checks (is_*)
CREATE FUNCTION is_eval_owner(
    p_user_id UUID,
    p_eval_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM evaluations
        WHERE id = p_eval_id
          AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- Permission checks (can_*)
CREATE FUNCTION can_access_eval(
    p_user_id UUID,
    p_eval_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check ownership OR workspace membership
    RETURN EXISTS (
        SELECT 1 FROM evaluations e
        WHERE e.id = p_eval_id
          AND (
              e.user_id = p_user_id
              OR EXISTS (
                  SELECT 1 FROM ws_members wm
                  WHERE wm.ws_id = e.ws_id
                    AND wm.user_id = p_user_id
              )
          )
    );
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION can_edit_eval(
    p_user_id UUID,
    p_eval_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Only owner can edit
    RETURN is_eval_owner(p_user_id, p_eval_id);
END;
$$ LANGUAGE plpgsql;
```

#### 004-rls.sql

**RLS policies (reference functions from 002, 003):**

```sql
-- Enable RLS
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Access policy using auth RPC functions
CREATE POLICY eval_access ON evaluations
    FOR SELECT
    USING (can_access_eval(auth.uid(), id));

-- Mutation policies
CREATE POLICY eval_insert ON evaluations
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY eval_update ON evaluations
    FOR UPDATE
    USING (is_eval_owner(auth.uid(), id));

CREATE POLICY eval_delete ON evaluations
    FOR DELETE
    USING (is_eval_owner(auth.uid(), id));
```

---

## 4. Python Helper Function Location Standard

### Required Structure

```python
org_common/
├── __init__.py          -- Exports only (no implementation)
├── auth.py              -- Auth helper functions (is_*, can_*)
├── database.py          -- Database helpers (find_one, upsert)
├── transform.py         -- Data transformation (snake→camel)
└── validation.py        -- Validation helpers
```

### __init__.py (Exports Only)

```python
"""org_common module - shared utilities for CORA modules."""

# Import and re-export from logical modules
from .auth import (
    get_user_from_event,
    get_supabase_user_id,
    is_sys_admin,
    is_org_admin,
    is_ws_admin,
    can_access_org_resource,
)

from .database import (
    find_one,
    find_many,
    upsert,
)

from .transform import (
    transform_record,
    snake_to_camel,
)

# Constants
SYS_ADMIN_ROLES = ['sys_owner', 'sys_admin']
ORG_ADMIN_ROLES = ['org_owner', 'org_admin']
WS_ADMIN_ROLES = ['ws_owner', 'ws_admin']

__all__ = [
    # Auth
    'get_user_from_event',
    'get_supabase_user_id',
    'is_sys_admin',
    'is_org_admin',
    'is_ws_admin',
    'can_access_org_resource',
    # Database
    'find_one',
    'find_many',
    'upsert',
    # Transform
    'transform_record',
    'snake_to_camel',
    # Constants
    'SYS_ADMIN_ROLES',
    'ORG_ADMIN_ROLES',
    'WS_ADMIN_ROLES',
]
```

### auth.py (Implementation)

```python
"""Authentication and authorization helper functions."""

from typing import Optional, Dict, Any
import os
from supabase import create_client, Client

def get_user_from_event(event: Dict) -> Optional[Dict]:
    """Extract user info from Lambda event."""
    user_info = event.get('requestContext', {}).get('authorizer', {}).get('lambda', {})
    if not user_info:
        return None
    return user_info

def get_supabase_user_id(external_uid: str) -> Optional[str]:
    """Convert external UID to Supabase user ID."""
    supabase = _get_supabase_client()
    result = supabase.from_('user_auth_ext_ids')\
        .select('user_id')\
        .eq('external_uid', external_uid)\
        .single()\
        .execute()
    
    return result.data.get('user_id') if result.data else None

def is_sys_admin(user_id: str) -> bool:
    """Check if user is system admin."""
    supabase = _get_supabase_client()
    result = supabase.rpc('is_sys_admin', {
        'p_user_id': user_id
    }).execute()
    return result.data if result.data else False

def is_org_admin(user_id: str, org_id: str) -> bool:
    """Check if user is org admin."""
    supabase = _get_supabase_client()
    result = supabase.rpc('is_org_admin', {
        'p_user_id': user_id,
        'p_org_id': org_id
    }).execute()
    return result.data if result.data else False

def is_ws_admin(user_id: str, ws_id: str) -> bool:
    """Check if user is workspace admin."""
    supabase = _get_supabase_client()
    result = supabase.rpc('is_ws_admin', {
        'p_user_id': user_id,
        'p_ws_id': ws_id
    }).execute()
    return result.data if result.data else False

def can_access_org_resource(user_id: str, org_id: str) -> bool:
    """Check if user can access organization resources."""
    supabase = _get_supabase_client()
    result = supabase.rpc('is_org_member', {
        'p_user_id': user_id,
        'p_org_id': org_id
    }).execute()
    return result.data if result.data else False

def _get_supabase_client() -> Client:
    """Get Supabase client (internal helper)."""
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
    return create_client(supabase_url, supabase_key)
```

---

## Validation

### Automated Checks

The DB Function Validator (integrated into api-tracer) validates:

1. **Parameter naming** - All parameters use `p_` prefix
2. **Function naming** - Functions follow naming patterns
3. **Schema organization** - Functions in correct files
4. **Python helpers** - Functions in logical files

```bash
# Run validation
python3 validation/api-tracer/cli.py validate \
  --path <stack-path> \
  --db-functions-only
```

---

## Common Mistakes

### ❌ Missing p_ Prefix

```sql
-- WRONG
CREATE FUNCTION is_admin(user_id UUID) RETURNS BOOLEAN;
```

```python
# WRONG
common.rpc('is_admin', {'user_id': user_id})
```

### ❌ Wrong Naming Pattern

```sql
-- WRONG - Use is_* not check_*
CREATE FUNCTION check_sys_admin(p_user_id UUID) RETURNS BOOLEAN;

-- WRONG - Use can_* not has_*
CREATE FUNCTION has_access(p_user_id UUID) RETURNS BOOLEAN;
```

### ❌ Wrong File Organization

```
-- WRONG - Auth functions in tables file
db/schema/001-tables.sql
  ├── CREATE TABLE evaluations...
  ├── CREATE FUNCTION is_eval_owner...  ❌ Should be in 003-auth-rpc.sql
```

### ❌ Implementation in __init__.py

```python
# WRONG - Implementation in __init__.py
# org_common/__init__.py
def is_sys_admin(user_id: str) -> bool:
    # 50+ lines of implementation...  ❌ Should be in auth.py
```

---

## References

- **ADR:** [ADR-020: RPC Function Standards](../arch%20decisions/ADR-020-RPC-PARAMETER-NAMING.md)
- **Related:** [ADR-019: Auth Standardization](../arch%20decisions/ADR-019-AUTH-STANDARDIZATION.md)
- **Validator:** `validation/api-tracer/` - DB Function Validator

---

**Last Updated:** February 5, 2026  
**Validation:** Automated via api-tracer DB Function Validator