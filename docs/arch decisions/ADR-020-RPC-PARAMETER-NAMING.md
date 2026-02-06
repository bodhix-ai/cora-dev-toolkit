# ADR-020: RPC Function Standards

**Status:** Approved  
**Date:** February 5, 2026  
**Decision Makers:** Product Team  
**Impact:** All database RPC functions, Lambda code, and Python helper functions

---

## Overview

This ADR establishes comprehensive standards for Supabase RPC functions, covering:
1. **Parameter naming** - `p_` prefix requirement
2. **Function naming** - Consistent naming patterns
3. **Schema organization** - Standalone vs integrated with table schemas
4. **Python helper functions** - Deployment location standards

These standards prevent silent auth failures, improve code maintainability, and ensure consistency across all CORA modules.

### The Problem Discovered (February 4, 2026)

During error remediation, a critical bug was discovered:

```python
# Lambda code (WRONG)
result = common.rpc('is_org_member', {
    'org_id': org_id,      # ❌ Function expects p_org_id
    'user_id': user_id     # ❌ Function expects p_user_id
})
```

```sql
-- Database function definition (CORRECT)
CREATE FUNCTION is_org_member(
    p_org_id UUID,         -- ✓ Uses p_ prefix
    p_user_id UUID         -- ✓ Uses p_ prefix
)
```

**Result:** `Could not find the function public.is_org_member(org_id, user_id)` → 401 errors across 3+ admin pages

**Root Cause:** Supabase RPC requires **exact parameter name matching**. No type coercion, no automatic mapping.


---

## Part 1: Parameter Naming Standard

### The Solution: p_ Prefix Standard

All Supabase RPC function parameters MUST use the `p_` prefix:

```sql
-- ✅ CORRECT: All parameters use p_ prefix
CREATE FUNCTION is_org_admin(
    p_user_id UUID,
    p_org_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM org_members
        WHERE user_id = p_user_id    -- Reference with p_ prefix
          AND org_id = p_org_id      -- Reference with p_ prefix
          AND org_role IN ('org_owner', 'org_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```python
# ✅ CORRECT: Python code uses p_ prefix to match SQL
result = common.rpc('is_org_admin', {
    'p_user_id': user_id,
    'p_org_id': org_id
})
```

---

## The Problem

### Before Standardization

1. **Inconsistent naming** across modules:
   - Some functions used `p_` prefix
   - Some used no prefix
   - Some mixed both approaches

2. **Silent failures**:
   - Supabase returns `function not found` error
   - Error message doesn't indicate parameter mismatch
   - Debugging took 2-8 hours per occurrence

3. **No validation**:
   - No way to catch mismatches before deployment
   - Errors only discovered at runtime

### Impact of Bug (February 4, 2026)

- **Affected:** 3+ admin pages returning 401 errors
- **Root cause:** `is_org_member` parameter mismatch
- **Time to fix:** 2 hours (investigation + fix + deployment)
- **Modules impacted:** module-mgmt, module-voice, module-eval

---

## Decision: Mandatory p_ Prefix

### All RPC Function Parameters

**Rule:** Every parameter in a Supabase RPC function MUST use the `p_` prefix.

**Rationale:**
1. **Clarity:** Distinguishes parameters from table columns
2. **Consistency:** Single pattern across all CORA modules
3. **Safety:** Explicit naming prevents accidental mismatches
4. **Convention:** Standard database practice (prefix = parameter)

### Examples

#### ✅ CORRECT

```sql
-- System admin check
CREATE FUNCTION is_sys_admin(
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = p_user_id
          AND sys_role IN ('sys_owner', 'sys_admin')
    );
END;
$$ LANGUAGE plpgsql;
```

```python
# Python code matches SQL
if common.rpc('is_sys_admin', {'p_user_id': user_id}):
    # Allow system admin operation
```

#### ❌ WRONG

```sql
-- NO PREFIX
CREATE FUNCTION is_sys_admin(
    user_id UUID  -- ❌ Missing p_ prefix
)
```

```python
# Mismatch causes runtime error
common.rpc('is_sys_admin', {'user_id': user_id})  # ❌ Won't work
```


---

## Part 2: Function Naming Standard

### The Problem: Inconsistent Naming Patterns

Multiple naming patterns exist across CORA modules:

```sql
-- Pattern 1: is_* (boolean checks)
is_sys_admin(p_user_id)
is_org_member(p_user_id, p_org_id)
is_eval_owner(p_user_id, p_eval_id)

-- Pattern 2: can_* (permission checks)
can_access_resource(p_user_id, p_resource_id)
can_edit_org(p_user_id, p_org_id)

-- Pattern 3: check_* (validation functions)
check_sys_admin(p_user_id)  -- ❌ Inconsistent with is_*
check_org_membership(p_user_id, p_org_id)  -- ❌ Inconsistent

-- Pattern 4: get_* (data retrieval)
get_user_orgs(p_user_id)
get_eval_results(p_eval_id)

-- Pattern 5: create_*/update_*/delete_* (mutations)
create_evaluation(p_user_id, p_config)
update_workspace(p_ws_id, p_updates)
```

### Decision: Standardized Function Naming

**Rule:** RPC function names MUST follow these patterns:

| Pattern | Use Case | Returns | Example |
|---------|----------|---------|---------|
| `is_*` | Boolean membership/role checks | BOOLEAN | `is_sys_admin`, `is_org_member` |
| `can_*` | Boolean permission checks | BOOLEAN | `can_access_resource`, `can_edit_eval` |
| `get_*` | Data retrieval (single/multiple rows) | TABLE/JSONB/type | `get_user_orgs`, `get_eval_config` |
| `create_*` | Insert operations | UUID (new ID) | `create_evaluation`, `create_workspace` |
| `update_*` | Update operations | BOOLEAN/VOID | `update_workspace`, `update_eval_config` |
| `delete_*` | Delete operations | BOOLEAN/VOID | `delete_evaluation`, `delete_document` |

### Naming Rules

#### ✅ CORRECT

```sql
-- Boolean checks: is_*
CREATE FUNCTION is_org_admin(p_user_id UUID, p_org_id UUID) RETURNS BOOLEAN;
CREATE FUNCTION is_eval_owner(p_user_id UUID, p_eval_id UUID) RETURNS BOOLEAN;

-- Permission checks: can_*
CREATE FUNCTION can_access_workspace(p_user_id UUID, p_ws_id UUID) RETURNS BOOLEAN;
CREATE FUNCTION can_edit_evaluation(p_user_id UUID, p_eval_id UUID) RETURNS BOOLEAN;

-- Data retrieval: get_*
CREATE FUNCTION get_user_workspaces(p_user_id UUID) RETURNS TABLE(...);
CREATE FUNCTION get_org_config(p_org_id UUID) RETURNS JSONB;

-- Mutations: create_*, update_*, delete_*
CREATE FUNCTION create_workspace(p_user_id UUID, p_config JSONB) RETURNS UUID;
CREATE FUNCTION update_eval_status(p_eval_id UUID, p_status TEXT) RETURNS BOOLEAN;
CREATE FUNCTION delete_document(p_user_id UUID, p_doc_id UUID) RETURNS BOOLEAN;
```

#### ❌ WRONG

```sql
-- ❌ Don't use check_* (use is_* instead)
CREATE FUNCTION check_sys_admin(p_user_id UUID) RETURNS BOOLEAN;

-- ❌ Don't use validate_* for boolean checks
CREATE FUNCTION validate_org_membership(p_user_id UUID) RETURNS BOOLEAN;

-- ❌ Don't use inconsistent patterns
CREATE FUNCTION user_is_admin(p_user_id UUID) RETURNS BOOLEAN;  -- Should be is_user_admin
CREATE FUNCTION has_org_access(p_user_id UUID) RETURNS BOOLEAN; -- Should be can_access_org
```

---

## Part 3: Schema Organization Standard

### The Problem: Scattered Function Definitions

RPC functions are currently defined in multiple locations:

```
module-access/
├── db/
│   ├── schema/
│   │   ├── 001-tables.sql          -- Table definitions
│   │   ├── 002-rls.sql             -- RLS policies
│   │   └── 010-rpc-functions.sql   -- ❓ Standalone RPC file
│   └── migrations/
│       └── 2026-02-05_add_auth_functions.sql
```

**Confusion:**
- Should RPC functions be in standalone files?
- Should they be integrated with table schema files?
- How to organize auth vs resource functions?

### Decision: Integrated Schema Organization

**Rule:** RPC functions MUST be organized by module and purpose, integrated with related table schemas.

#### Standard Directory Structure

```
module-{name}/
├── db/
│   ├── schema/
│   │   ├── 001-tables.sql              -- Table definitions
│   │   ├── 002-tables-rpc.sql          -- ✓ RPC functions for table operations
│   │   ├── 003-auth-rpc.sql            -- ✓ Auth/permission RPC functions
│   │   └── 004-rls.sql                 -- RLS policies (references RPC functions)
│   └── migrations/
│       └── {timestamp}_{description}.sql
```

#### File Naming Pattern

| File | Content | Example |
|------|---------|---------|
| `001-tables.sql` | Table definitions only | `evaluations`, `eval_doc_summaries` |
| `002-tables-rpc.sql` | Table operation functions | `get_*`, `create_*`, `update_*`, `delete_*` |
| `003-auth-rpc.sql` | Auth/permission functions | `is_*`, `can_*` |
| `004-rls.sql` | RLS policies | References functions from 002, 003 |

#### Example: module-eval Schema Organization

```sql
-- db/schema/001-tables.sql
CREATE TABLE evaluations (...);
CREATE TABLE eval_doc_summaries (...);

-- db/schema/002-tables-rpc.sql
-- Table operation functions
CREATE FUNCTION get_evaluation(p_eval_id UUID) RETURNS JSONB;
CREATE FUNCTION create_evaluation(p_user_id UUID, p_config JSONB) RETURNS UUID;
CREATE FUNCTION update_eval_status(p_eval_id UUID, p_status TEXT) RETURNS BOOLEAN;

-- db/schema/003-auth-rpc.sql
-- Auth/permission functions
CREATE FUNCTION is_eval_owner(p_user_id UUID, p_eval_id UUID) RETURNS BOOLEAN;
CREATE FUNCTION can_access_eval(p_user_id UUID, p_eval_id UUID) RETURNS BOOLEAN;
CREATE FUNCTION can_edit_eval(p_user_id UUID, p_eval_id UUID) RETURNS BOOLEAN;

-- db/schema/004-rls.sql
-- RLS policies (use functions from 003)
CREATE POLICY eval_access ON evaluations
  USING (can_access_eval(auth.uid(), id));
```

### Benefits of Integrated Organization

1. **Logical grouping** - Functions near related tables
2. **Clear dependencies** - Load order: tables → RPC → RLS
3. **Easier maintenance** - Related code in adjacent files
4. **Schema clarity** - File names describe purpose

---

## Part 4: Python Helper Function Location Standard

### The Problem: Inconsistent Helper Function Placement

During ADR-019 implementation, auth helper functions were incorrectly added to `__init__.py` instead of the logical `auth.py` file:

```python
# ❌ WRONG: Added to __init__.py
# org_common/__init__.py
def is_sys_admin(user_id: str) -> bool:
    """Check if user is sys admin."""
    ...

def is_org_admin(user_id: str, org_id: str) -> bool:
    """Check if user is org admin."""
    ...
```

**Problems:**
1. `__init__.py` becomes cluttered with implementation details
2. Legacy auth functions already exist in `auth.py`
3. Mixed responsibility - initialization vs implementation
4. Harder to find specific helper functions

### Decision: Logical File Organization

**Rule:** Python helper functions MUST be organized in logically named files by purpose, NOT in `__init__.py`.

#### Standard org_common Structure

```python
org_common/
├── __init__.py          -- ✓ Exports only (from .auth import *, etc.)
├── auth.py              -- ✓ Auth helper functions (is_*, can_*)
├── database.py          -- ✓ Database helpers (find_one, upsert, etc.)
├── transform.py         -- ✓ Data transformation (snake→camel, etc.)
└── validation.py        -- ✓ Validation helpers
```

#### ✅ CORRECT: Logical Organization

```python
# org_common/__init__.py
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
```

```python
# org_common/auth.py
"""Authentication and authorization helper functions."""

from typing import Optional, Dict, Any
import os
from supabase import create_client, Client

def get_user_from_event(event: Dict) -> Optional[Dict]:
    """Extract user info from Lambda event."""
    ...

def get_supabase_user_id(external_uid: str) -> Optional[str]:
    """Convert external UID to Supabase user ID."""
    ...

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

# ... other auth functions ...
```

#### ❌ WRONG: Everything in __init__.py

```python
# org_common/__init__.py (WRONG - implementation in init file)
def is_sys_admin(user_id: str) -> bool:
    """Check if user is sys admin."""
    # 50+ lines of implementation code
    ...

def is_org_admin(user_id: str, org_id: str) -> bool:
    """Check if user is org admin."""
    # 50+ lines of implementation code
    ...

# ... 500+ more lines ...
```

### Migration Path for ADR-019 Incorrectly Placed Functions

1. **Create `auth.py`** with proper implementation
2. **Move functions** from `__init__.py` to `auth.py`
3. **Update `__init__.py`** to import and re-export
4. **No Lambda code changes** needed (imports still work)

---

## Key Principles (Parameter Naming)

### 1. Exact Name Matching Required

Supabase RPC uses **exact parameter name matching**:

```python
# These are NOT equivalent:
common.rpc('function', {'user_id': x})    # ❌ user_id
common.rpc('function', {'p_user_id': x})  # ✓ p_user_id
common.rpc('function', {'userId': x})     # ❌ userId (camelCase)
```

**Why:** Supabase passes parameters as a JSON object to PostgreSQL functions. PostgreSQL requires exact name matches.

### 2. Prefix in SQL, Prefix in Python

The `p_` prefix must appear in BOTH places:

```sql
-- SQL function definition
CREATE FUNCTION my_function(
    p_param_one UUID,     -- ✓ p_ prefix
    p_param_two TEXT      -- ✓ p_ prefix
)
```

```python
# Python code calling RPC
common.rpc('my_function', {
    'p_param_one': value1,   # ✓ Matches SQL
    'p_param_two': value2    # ✓ Matches SQL
})
```

### 3. Use Inside Function Body

Inside the SQL function body, reference parameters with the `p_` prefix:

```sql
CREATE FUNCTION is_eval_owner(
    p_user_id UUID,
    p_eval_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM eval_doc_summaries
        WHERE user_id = p_user_id       -- ✓ Reference with prefix
          AND evaluation_id = p_eval_id -- ✓ Reference with prefix
    );
END;
$$ LANGUAGE plpgsql;
```

### 4. No Exceptions

**All parameters must use p_ prefix**, including:
- UUID parameters
- Text parameters
- Integer parameters
- JSONB parameters
- Array parameters

---

## Common Patterns

### Single Parameter Functions

```sql
CREATE FUNCTION get_user_orgs(
    p_user_id UUID
) RETURNS TABLE(...) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM organizations
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

### Multi-Parameter Functions

```sql
CREATE FUNCTION can_access_resource(
    p_user_id UUID,
    p_resource_id UUID,
    p_org_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check ownership OR org membership
    RETURN EXISTS (
        SELECT 1 FROM resources
        WHERE id = p_resource_id
          AND (owner_id = p_user_id 
               OR org_id = p_org_id)
    );
END;
$$ LANGUAGE plpgsql;
```

### JSONB Parameters

```sql
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
```

---

## Part 5: Implementation Guidelines

### Migration Path

**For existing functions with incorrect naming:**

1. **Update SQL function definition** to use `p_` prefix
2. **Update Python Lambda code** to use `p_` prefix
3. **Deploy Lambda first** (will work with both old and new function during transition)
4. **Run database migration** to update function signature
5. **Verify** using api-tracer validator

### org_common Helper Functions

All `org_common` functions that call RPC MUST use `p_` prefix:

```python
# org_common/auth.py
def is_org_admin(user_id: str, org_id: str) -> bool:
    """Check if user is org admin."""
    result = common.rpc('is_org_admin', {
        'p_user_id': user_id,  # ✓ Uses p_ prefix
        'p_org_id': org_id     # ✓ Uses p_ prefix
    })
    return result
```

---

## Validation

### DB Function Validator

The new DB Function Validator (integrated into api-tracer) validates all four standards:

1. **Parameter naming** - All parameters use `p_` prefix
2. **Function naming** - Functions follow is_*/can_*/get_*/create_* patterns
3. **Schema organization** - Functions in correct files (002-tables-rpc.sql, 003-auth-rpc.sql)
4. **Python helpers** - Functions in logical files (auth.py, database.py, etc.)
5. **RPC call matching** - Python calls match SQL function signatures exactly

```bash
# Run DB function validation
python3 validation/api-tracer/cli.py validate \
  --path <stack-path> \
  --db-functions-only
```

**Catches:**
- Missing `p_` prefix in SQL function parameters
- Incorrect function naming patterns (check_* instead of is_*)
- Functions in wrong schema files
- Python helpers in `__init__.py` instead of logical files
- Parameter name mismatches between Python and SQL

### Example Output

```
DB Function Validation:

module-access:
  ❌ Parameter naming (is_org_member, line 45):
     SQL expects: p_org_id, p_user_id
     Python passes: org_id, user_id
     Fix: Update Python code to use p_ prefix
  
  ❌ Function naming (check_sys_admin, line 12):
     Uses check_* pattern instead of is_*
     Fix: Rename to is_sys_admin for consistency
  
  ❌ Schema organization (auth functions in 001-tables.sql):
     Auth functions should be in 003-auth-rpc.sql
     Fix: Move to separate auth-rpc file

module-eval:
  ✓ is_eval_owner: All standards compliant
  ✓ can_access_eval: All standards compliant
  ✓ get_evaluation: All standards compliant
```

---

## Anti-Patterns

### ❌ NO PREFIX

```sql
-- WRONG
CREATE FUNCTION is_admin(user_id UUID, org_id UUID)
```

### ❌ INCONSISTENT PREFIX

```sql
-- WRONG - Mixed prefix usage
CREATE FUNCTION check_access(
    p_user_id UUID,    -- Has prefix
    resource_id UUID   -- No prefix ❌
)
```

### ❌ PYTHON MISMATCH

```python
# WRONG - SQL uses p_ but Python doesn't
common.rpc('is_org_admin', {
    'user_id': user_id,  # ❌ Should be p_user_id
    'org_id': org_id     # ❌ Should be p_org_id
})
```

---

## Consequences

### Positive

1. **Prevents runtime errors** from parameter mismatches
2. **Clear parameter identification** in function bodies
3. **Automated validation** catches errors before deployment
4. **Consistent pattern** across all CORA modules
5. **Easier debugging** when parameter issues occur

### Negative

1. **Slight verbosity** - `p_user_id` vs `user_id`, `is_*` vs `check_*`
2. **Migration effort** for existing functions and file reorganization
3. **Breaking changes** for functions not following standards
4. **File restructuring** required for schema organization

### Migration Effort

Estimated impact:
- **Parameter naming:** ~50 database functions + ~200 RPC calls
- **Function naming:** ~20-30 functions to rename (check_* → is_*)
- **Schema organization:** ~6-8 modules to restructure schema files
- **Python helpers:** Move ~15-20 functions from `__init__.py` to `auth.py`
- **Total time:** ~8-12 hours for complete migration
- **Risk:** Medium-High (requires careful testing + database migrations)

---

## References

### Related ADRs
- [ADR-019: Auth Standardization](./ADR-019-AUTH-STANDARDIZATION.md) - Uses RPC functions for auth checks
- [ADR-019b: Backend Auth](./ADR-019b-AUTH-BACKEND.md) - RPC function patterns

### Implementation Standards
- [RPC Function Standards](../standards/04_std_data_RPC-FUNCTIONS.md) - Detailed implementation guide

### Validation Tools
- DB Function Validator (api-tracer) - Validates parameter naming compliance

---

**Status:** ✅ Approved  
**Enforcement:** DB Function Validator (api-tracer)  
**Migration:** Sprint S5 of Error Remediation Initiative  
**Next Step:** Implement DB Function Validator to enforce this standard