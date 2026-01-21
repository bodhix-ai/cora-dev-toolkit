# Lambda Change Inventory - Schema Naming Compliance Audit

**Date**: January 20, 2026  
**Branch**: `schema-naming-audit`  
**Purpose**: Document all Lambda code changes required for `workspace_id` → `ws_id` migration  
**Status**: 📋 READY FOR IMPLEMENTATION  
**Related Plan**: `docs/plans/plan_schema-naming-compliance-audit.md`

---

## Executive Summary

This document inventories all Lambda code changes required to align with the database schema migration from `workspace_id` to `ws_id`. The database migrations are **COMPLETE** and these Lambda changes are needed to maintain compatibility.

**Coordination Note**: Other teams are currently modifying Lambda code. These changes should be implemented in **separate branches** to avoid merge conflicts with ongoing work.

---

## Migration Overview

### What Changed in the Database

All database tables and RPC functions have been migrated from `workspace_id` to `ws_id`:

| Table/Function | Old Column/Param | New Column/Param | Migration File |
|----------------|------------------|------------------|----------------|
| `eval_doc_summaries` | `workspace_id` | `ws_id` | `2026-01-20_rename-eval_doc_summaries-workspace_id-to-ws_id.sql` |
| `chat_sessions` | `workspace_id` | `ws_id` | `2026-01-20_rename-chat_sessions-workspace_id-to-ws_id.sql` |
| `kb_bases` | `workspace_id` | `ws_id` | `2026-01-20_rename-kb_bases-workspace_id-to-ws_id.sql` |
| `kb_access_ws` | `workspace_id` | `ws_id` | `2026-01-20_rename-kb_access_ws-workspace_id-to-ws_id.sql` |
| `voice_sessions` | `workspace_id` | `ws_id` | `2026-01-20_rename-voice_sessions-workspace_id-to-ws_id.sql` |
| WS RPC functions | `p_workspace_id` | `p_ws_id` | `2026-01-20_update-ws-rpc-functions-workspace_id-to-ws_id.sql` |

### What Needs to Change in Lambda Code

Lambda functions must update their database queries to use `ws_id` instead of `workspace_id` in:
- SELECT filters: `WHERE workspace_id = ?` → `WHERE ws_id = ?`
- INSERT statements: `INSERT INTO table (workspace_id, ...) VALUES (?, ...)` → `INSERT INTO table (ws_id, ...) VALUES (?, ...)`
- UPDATE statements: `UPDATE table SET workspace_id = ?` → `UPDATE table SET ws_id = ?`
- Dictionary keys: `{'workspace_id': value}` → `{'ws_id': value}`
- RPC function calls: `function(workspace_id=...)` → `function(ws_id=...)`

**Important**: Python variable names (e.g., `workspace_id = event.get('workspace_id')`) can remain unchanged for backward compatibility with API requests. Only the database column references need updating.

---

## Module-Eval: Lambda Changes

### Files to Update

#### 1. `eval-processor/lambda_function.py`

**Estimated Changes**: ~48 instances

**Search Pattern**:
```python
# Find all database operations
grep -n "workspace_id" eval-processor/lambda_function.py
```

**Example Changes**:

```python
# BEFORE:
doc_summary = {
    'id': str(uuid.uuid4()),
    'workspace_id': workspace_id,  # ❌ OLD
    'doc_id': doc_id,
    'summary_text': summary
}

# AFTER:
doc_summary = {
    'id': str(uuid.uuid4()),
    'ws_id': workspace_id,  # ✅ NEW (dict key changed, variable name can stay)
    'doc_id': doc_id,
    'summary_text': summary
}
```

```python
# BEFORE:
result = common.find_one('eval_doc_summaries', {
    'doc_id': doc_id,
    'workspace_id': workspace_id  # ❌ OLD
})

# AFTER:
result = common.find_one('eval_doc_summaries', {
    'doc_id': doc_id,
    'ws_id': workspace_id  # ✅ NEW
})
```

**Verification**:
```bash
# After changes, verify no database references remain:
grep -n "workspace_id.*common\." eval-processor/lambda_function.py
grep -n "'workspace_id':" eval-processor/lambda_function.py
# Should return 0 results (only API/variable references allowed)
```

---

#### 2. `eval-results/lambda_function.py`

**Estimated Changes**: ~15-20 instances

**Search Pattern**:
```python
grep -n "workspace_id" eval-results/lambda_function.py
```

**Example Changes**:

```python
# BEFORE:
summaries = common.find_many('eval_doc_summaries', {
    'workspace_id': workspace_id,  # ❌ OLD
    'is_deleted': False
})

# AFTER:
summaries = common.find_many('eval_doc_summaries', {
    'ws_id': workspace_id,  # ✅ NEW
    'is_deleted': False
})
```

**Verification**:
```bash
grep -n "'workspace_id':" eval-results/lambda_function.py
# Should return 0 results
```

---

## Module-Chat: Lambda Changes

### Files to Update

#### 1. `chat-sessions/lambda_function.py`

**Estimated Changes**: ~25-30 instances

**Search Pattern**:
```python
grep -n "workspace_id" chat-sessions/lambda_function.py
```

**Example Changes**:

```python
# BEFORE:
session = {
    'id': str(uuid.uuid4()),
    'org_id': org_id,
    'workspace_id': workspace_id,  # ❌ OLD
    'created_by': user_id,
    'title': title
}

# AFTER:
session = {
    'id': str(uuid.uuid4()),
    'org_id': org_id,
    'ws_id': workspace_id,  # ✅ NEW
    'created_by': user_id,
    'title': title
}
```

**RPC Function Calls**:
```python
# BEFORE:
result = common.execute_rpc('get_chat_sessions_for_user', {
    'p_user_id': user_id,
    'p_workspace_id': workspace_id  # ❌ OLD parameter name
})

# AFTER:
result = common.execute_rpc('get_chat_sessions_for_user', {
    'p_user_id': user_id,
    'p_ws_id': workspace_id  # ✅ NEW parameter name
})
```

**Verification**:
```bash
grep -n "'workspace_id':" chat-sessions/lambda_function.py
grep -n "p_workspace_id" chat-sessions/lambda_function.py
# Both should return 0 results
```

---

## Module-KB: Lambda Changes

### Files to Update

#### 1. `kb-processor/lambda_function.py`

**Estimated Changes**: ~30-35 instances

**Search Pattern**:
```python
grep -n "workspace_id" kb-processor/lambda_function.py
```

**Example Changes**:

```python
# BEFORE:
kb_base = {
    'id': str(uuid.uuid4()),
    'name': name,
    'scope': 'workspace',
    'org_id': org_id,
    'workspace_id': workspace_id,  # ❌ OLD
}

# AFTER:
kb_base = {
    'id': str(uuid.uuid4()),
    'name': name,
    'scope': 'workspace',
    'org_id': org_id,
    'ws_id': workspace_id,  # ✅ NEW
}
```

**RPC Function Calls**:
```python
# BEFORE:
kbs = common.execute_rpc('get_accessible_kbs_for_workspace', {
    'p_user_id': user_id,
    'p_workspace_id': workspace_id  # ❌ OLD parameter name
})

# AFTER:
kbs = common.execute_rpc('get_accessible_kbs_for_workspace', {
    'p_user_id': user_id,
    'p_ws_id': workspace_id  # ✅ NEW parameter name
})
```

**Access Control**:
```python
# BEFORE:
access = common.find_one('kb_access_ws', {
    'kb_id': kb_id,
    'workspace_id': workspace_id  # ❌ OLD
})

# AFTER:
access = common.find_one('kb_access_ws', {
    'kb_id': kb_id,
    'ws_id': workspace_id  # ✅ NEW
})
```

**Verification**:
```bash
grep -n "'workspace_id':" kb-processor/lambda_function.py
grep -n "p_workspace_id" kb-processor/lambda_function.py
# Both should return 0 results
```

---

## Module-Voice: Lambda Changes

### Files to Update

#### 1. `voice-processor/lambda_function.py`

**Estimated Changes**: ~20-25 instances

**Search Pattern**:
```python
grep -n "workspace_id" voice-processor/lambda_function.py
```

**Example Changes**:

```python
# BEFORE:
voice_session = {
    'id': str(uuid.uuid4()),
    'workspace_id': workspace_id,  # ❌ OLD
    'user_id': user_id,
    'status': 'active'
}

# AFTER:
voice_session = {
    'id': str(uuid.uuid4()),
    'ws_id': workspace_id,  # ✅ NEW
    'user_id': user_id,
    'status': 'active'
}
```

**Verification**:
```bash
grep -n "'workspace_id':" voice-processor/lambda_function.py
# Should return 0 results
```

---

## Module-WS: Lambda Changes

### Files to Update

#### 1. `ws-manager/lambda_function.py`

**Estimated Changes**: ~15-20 instances (RPC function calls only)

**Search Pattern**:
```python
grep -n "p_workspace_id" ws-manager/lambda_function.py
```

**Example Changes**:

```python
# BEFORE:
result = common.execute_rpc('update_workspace', {
    'p_workspace_id': workspace_id,  # ❌ OLD parameter name
    'p_name': new_name,
    'p_description': new_description
})

# AFTER:
result = common.execute_rpc('update_workspace', {
    'p_ws_id': workspace_id,  # ✅ NEW parameter name
    'p_name': new_name,
    'p_description': new_description
})
```

**All RPC Functions Updated**:
- `create_workspace()` - no workspace_id parameter (it's created, not passed)
- `update_workspace(p_ws_id, ...)` - ✅ parameter renamed
- `delete_workspace(p_ws_id)` - ✅ parameter renamed
- `get_user_workspaces(p_user_id)` - no change needed
- `get_workspace_members(p_ws_id)` - ✅ parameter renamed
- `add_workspace_member(p_ws_id, ...)` - ✅ parameter renamed
- `remove_workspace_member(p_ws_id, ...)` - ✅ parameter renamed
- `update_workspace_member_role(p_ws_id, ...)` - ✅ parameter renamed

**Verification**:
```bash
grep -n "p_workspace_id" ws-manager/lambda_function.py
# Should return 0 results
```

---

## Frontend Changes (If Needed)

### TypeScript Interface Updates

If frontend code directly references database column names (e.g., in API responses), update TypeScript interfaces:

```typescript
// BEFORE:
interface EvalDocSummary {
  id: string;
  workspace_id: string;  // ❌ OLD
  doc_id: string;
  summary_text: string;
}

// AFTER:
interface EvalDocSummary {
  id: string;
  ws_id: string;  // ✅ NEW
  doc_id: string;
  summary_text: string;
}
```

**Note**: Frontend changes are only needed if the frontend directly receives database objects. If APIs transform the response, no frontend changes may be needed.

---

## Testing Strategy

### Per Module Testing

After updating Lambda code for each module:

1. **Unit Tests**:
   ```bash
   # Run module-specific tests
   pytest tests/test_eval_lambdas.py
   pytest tests/test_chat_lambdas.py
   pytest tests/test_kb_lambdas.py
   ```

2. **Integration Tests**:
   ```bash
   # Test database queries work correctly
   python -m pytest tests/integration/test_db_queries.py
   ```

3. **Manual Testing**:
   - Create a new eval doc summary
   - Fetch eval results by workspace
   - Create/list chat sessions
   - Access workspace-scoped KBs
   - Start/list voice sessions

4. **Verification Queries**:
   ```sql
   -- Verify data is being inserted correctly
   SELECT * FROM eval_doc_summaries ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM chat_sessions ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM kb_bases WHERE scope = 'workspace' LIMIT 5;
   ```

---

## Deployment Sequence

**Recommended Order**:

1. **Deploy Database Migrations** (ALREADY COMPLETE):
   - Run all 6 migration scripts
   - Verify database schema updated correctly

2. **Deploy Lambda Changes** (THIS INVENTORY):
   - Module-Eval Lambdas
   - Module-Chat Lambdas
   - Module-KB Lambdas
   - Module-Voice Lambdas
   - Module-WS Lambdas

3. **Monitor Logs**:
   ```bash
   # Watch for database errors
   aws logs tail /aws/lambda/eval-processor --follow
   aws logs tail /aws/lambda/chat-sessions --follow
   ```

4. **Rollback Plan**:
   - If Lambda changes cause issues, revert to previous version
   - Database schema is backward compatible during transition period
   - Gradual rollout: deploy one module at a time

---

## Common Patterns & Helper Script

### Find and Replace Pattern

```bash
# In each Lambda directory:
cd packages/module-eval/backend/lambdas/eval-processor

# Find all occurrences
grep -n "'workspace_id'" lambda_function.py

# Automated replacement (BE CAREFUL - review changes!)
sed -i.bak "s/'workspace_id':/'ws_id':/g" lambda_function.py

# Review changes
diff lambda_function.py.bak lambda_function.py

# If correct, remove backup
rm lambda_function.py.bak
```

### Validation Script

```python
#!/usr/bin/env python3
"""
Validate that Lambda functions use ws_id instead of workspace_id
"""
import re
import sys
from pathlib import Path

def check_lambda_file(filepath):
    """Check a Lambda file for workspace_id references in DB operations"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Find problematic patterns
    issues = []
    
    # Pattern 1: Dictionary keys for DB operations
    db_dict_pattern = r"(common\.(find_one|find_many|insert_one|update_one|execute_rpc).*\{[^}]*)'workspace_id'"
    matches = re.finditer(db_dict_pattern, content, re.DOTALL)
    for match in matches:
        line_num = content[:match.start()].count('\n') + 1
        issues.append(f"Line {line_num}: Database dict key 'workspace_id' should be 'ws_id'")
    
    # Pattern 2: RPC function parameters
    rpc_param_pattern = r"'p_workspace_id'"
    matches = re.finditer(rpc_param_pattern, content)
    for match in matches:
        line_num = content[:match.start()].count('\n') + 1
        issues.append(f"Line {line_num}: RPC parameter 'p_workspace_id' should be 'p_ws_id'")
    
    return issues

def main():
    lambda_files = Path('.').rglob('lambda_function.py')
    
    all_issues = {}
    for filepath in lambda_files:
        issues = check_lambda_file(filepath)
        if issues:
            all_issues[str(filepath)] = issues
    
    if all_issues:
        print("❌ Found workspace_id references in database operations:\n")
        for filepath, issues in all_issues.items():
            print(f"📄 {filepath}")
            for issue in issues:
                print(f"  - {issue}")
            print()
        sys.exit(1)
    else:
        print("✅ All Lambda functions use ws_id correctly!")
        sys.exit(0)

if __name__ == '__main__':
    main()
```

---

## Estimated Effort

| Module | Lambda Files | Est. Instances | Est. Time | Complexity |
|--------|--------------|----------------|-----------|------------|
| **module-eval** | 2 files | ~65 | 2-3 hours | Medium |
| **module-chat** | 1 file | ~30 | 1-2 hours | Medium |
| **module-kb** | 1 file | ~35 | 2-3 hours | High (RPC calls) |
| **module-voice** | 1 file | ~25 | 1-2 hours | Low |
| **module-ws** | 1 file | ~20 | 1-2 hours | Low (RPC only) |
| **Testing** | All modules | - | 2-3 hours | - |
| **TOTAL** | 6 files | ~175 | **9-15 hours** | **~2 work days** |

---

## Success Criteria

- [ ] **Module-Eval**: All Lambda functions use `ws_id` in database operations
- [ ] **Module-Chat**: All Lambda functions use `ws_id` and `p_ws_id` parameters
- [ ] **Module-KB**: All Lambda functions use `ws_id` and `p_ws_id` parameters
- [ ] **Module-Voice**: All Lambda functions use `ws_id` in database operations
- [ ] **Module-WS**: All Lambda functions use `p_ws_id` in RPC calls
- [ ] **Testing**: All integration tests pass
- [ ] **Verification**: Validation script returns 0 issues
- [ ] **Production**: No database errors in Lambda logs after deployment

---

## Questions & Support

If you encounter issues while implementing these changes:

1. **Database errors**: Verify migration scripts ran successfully
2. **RPC function errors**: Check function signatures match migration file
3. **Type mismatches**: Ensure using UUID type, not string
4. **Coordination**: Check with other teams to avoid merge conflicts

**Related Documents**:
- Plan: `docs/plans/plan_schema-naming-compliance-audit.md`
- Findings: `docs/plans/findings_schema-naming-audit_phase1.md`
- Migration Files: `scripts/migrations/2026-01-20_*.sql`

---

**Document Status**: ✅ READY FOR IMPLEMENTATION  
**Database Migrations**: ✅ COMPLETE  
**Lambda Changes**: ⏳ PENDING (documented here)  
**Created**: January 20, 2026  
**Last Updated**: January 20, 2026
