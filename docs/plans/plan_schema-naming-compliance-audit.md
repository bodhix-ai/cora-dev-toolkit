# Schema Naming Compliance Audit & Remediation Plan

**Status**: 🟡 IN PROGRESS  
**Branch**: `schema-naming-audit`  
**Priority**: 🟡 Medium-High (Blocks future development, causes bugs)  
**Created**: January 20, 2026  
**Started**: January 20, 2026  
**Owner**: Engineering Team  

---

## Executive Summary

**SCOPE:** This audit focuses ONLY on **newly introduced modules** (kb, chat, eval, voice, ws). Legacy core modules (access, ai, mgmt) are excluded and covered by `docs/plans/backlog/plan_db-naming-migration.md`.

**BLOCKER FOR:** `docs/plans/plan_eval-inference-profile-fix.md` - Must complete this audit before fixing eval inference profile issues.

A focused audit of newly introduced module database schema objects, RLS policies, and application code to identify and remediate naming standard violations per `docs/standards/cora/standard_DATABASE-NAMING.md`.

**Modules in Scope:**
- ✅ `module-kb` - Knowledge Base
- ✅ `module-chat` - Chat & Messaging  
- ✅ `module-eval` - Evaluation
- ✅ `module-voice` - Voice Interaction
- ✅ `module-ws` - Workspace Management

**Modules EXCLUDED (Legacy - See Backlog Plan):**
- ❌ `module-access` - Identity & Access (see backlog plan Phase 1)
- ❌ `module-ai` - AI Provider Management (see backlog plan Phase 4)
- ❌ `module-mgmt` - Platform Management (see backlog plan Phase 2)

**Discovered Issues:**
- `kb_access_ws` table uses `workspace_id` column (should be `ws_id` per Rule 3)
- Unknown number of other tables with similar issues in new modules
- RLS policies reference non-standard column names
- Lambda functions use inconsistent column references

**Impact if Not Fixed:**
- ❌ **BLOCKS eval-inference-profile-fix** - Cannot proceed until naming is compliant
- Continued 406 errors on database queries
- RLS policy failures
- Developer confusion and maintenance burden
- Future bugs when adding features

**Related Plans:**
- **Legacy Modules:** `docs/plans/backlog/plan_db-naming-migration.md` - Deferred lower-priority work
- **Blocked Plan:** `docs/plans/plan_eval-inference-profile-fix.md` - Requires this audit complete

---

## Phase 1: Schema Analysis (Discovery)

### 1.1: Table Column Name Audit

**Objective**: Find all column name violations of abbreviated foreign key standards in NEW modules only.

**Process:**
```bash
# Search ONLY in new modules (kb, chat, eval, voice, ws)
cd templates/_modules-core
cd templates/_modules-functional

# Find workspace_id columns (should be ws_id) - NEW MODULES ONLY
grep -r "workspace_id" --include="*.sql" \
  templates/_modules-core/module-kb/ \
  templates/_modules-core/module-chat/ \
  templates/_modules-functional/module-eval/ \
  templates/_modules-functional/module-voice/ \
  templates/_modules-functional/module-ws/

# Find knowledge_base_id columns (should be kb_id) - NEW MODULES ONLY
grep -r "knowledge_base_id" --include="*.sql" \
  templates/_modules-core/module-kb/ \
  templates/_modules-core/module-chat/ \
  templates/_modules-functional/module-eval/ \
  templates/_modules-functional/module-voice/ \
  templates/_modules-functional/module-ws/

# Find workflow_id columns (should be wf_id) - NEW MODULES ONLY
grep -r "workflow_id" --include="*.sql" \
  templates/_modules-core/module-kb/ \
  templates/_modules-core/module-chat/ \
  templates/_modules-functional/module-eval/ \
  templates/_modules-functional/module-voice/ \
  templates/_modules-functional/module-ws/

# Find organization_id columns (should be org_id) - NEW MODULES ONLY
grep -r "organization_id" --include="*.sql" \
  templates/_modules-core/module-kb/ \
  templates/_modules-core/module-chat/ \
  templates/_modules-functional/module-eval/ \
  templates/_modules-functional/module-voice/ \
  templates/_modules-functional/module-ws/
```

**Output**: `findings_table-column-names.md`

**Expected Violations:**
- `workspace_id` → should be `ws_id` (per Rule 3)
- `knowledge_base_id` → should be `kb_id`
- `workflow_id` → should be `wf_id`
- Any other long-form column names for abbreviated entities

---

### 1.2: RLS Policy Audit

**Objective**: Find RLS policies referencing non-standard column names in NEW modules only.

**Process:**
```bash
# Find RLS policy files in NEW modules only
find templates/_modules-core/module-kb -name "*rls*.sql" -type f
find templates/_modules-core/module-chat -name "*rls*.sql" -type f
find templates/_modules-functional/module-eval -name "*rls*.sql" -type f
find templates/_modules-functional/module-voice -name "*rls*.sql" -type f
find templates/_modules-functional/module-ws -name "*rls*.sql" -type f

# Check for workspace_id references in NEW modules
grep -B 5 -A 5 "workspace_id" \
  templates/_modules-core/module-kb/**/*rls*.sql \
  templates/_modules-core/module-chat/**/*rls*.sql \
  templates/_modules-functional/module-eval/**/*rls*.sql \
  templates/_modules-functional/module-voice/**/*rls*.sql \
  templates/_modules-functional/module-ws/**/*rls*.sql

# Check for knowledge_base_id references in NEW modules
grep -B 5 -A 5 "knowledge_base_id" \
  templates/_modules-core/module-kb/**/*rls*.sql \
  templates/_modules-core/module-chat/**/*rls*.sql \
  templates/_modules-functional/module-eval/**/*rls*.sql \
  templates/_modules-functional/module-voice/**/*rls*.sql \
  templates/_modules-functional/module-ws/**/*rls*.sql
```

**Output**: `findings_rls-policies.md`

**Expected Violations:**
- Policies checking `workspace_id` against `ws_members.ws_id` (type mismatch)
- Policies with incorrect column references
- Helper functions using old column names

---

### 1.3: Index Audit

**Objective**: Find indexes on non-standard column names.

**Process:**
```bash
# Find all CREATE INDEX statements
grep -r "CREATE INDEX" --include="*.sql" templates/

# Find indexes on workspace_id
grep -r "workspace_id" --include="*.sql" templates/ | grep "CREATE INDEX"

# Check index naming compliance
grep -r "CREATE INDEX" --include="*.sql" templates/ | \
  grep -v "idx_.*" | grep -v "UNIQUE"  # Non-compliant names
```

**Output**: `findings_indexes.md`

**Expected Violations:**
- Indexes on `workspace_id` columns (need renaming)
- Index names not following `idx_{table}_{column}` pattern

---

### 1.4: Foreign Key Constraint Audit

**Objective**: Find foreign key constraints with non-standard naming.

**Process:**
```bash
# Find all foreign key constraints
grep -r "REFERENCES" --include="*.sql" templates/

# Find FK references to workspaces
grep -r "workspace_id.*REFERENCES.*workspaces" --include="*.sql" templates/

# Check constraint naming
grep -r "CONSTRAINT.*FOREIGN KEY" --include="*.sql" templates/
```

**Output**: `findings_foreign-keys.md`

**Expected Violations:**
- FK constraints named with old column names
- FK constraints not following `fk_{table}_{column}` pattern

---

### 1.5: Function & Trigger Audit

**Objective**: Find functions/triggers using non-standard column names.

**Process:**
```bash
# Find all function definitions
grep -r "CREATE FUNCTION\|CREATE OR REPLACE FUNCTION" --include="*.sql" templates/

# Search function bodies for workspace_id
grep -B 10 -A 30 "CREATE FUNCTION" templates/**/*.sql | grep "workspace_id"

# Find triggers
grep -r "CREATE TRIGGER" --include="*.sql" templates/
```

**Output**: `findings_functions-triggers.md`

**Expected Violations:**
- Helper functions (e.g., `can_access_kb()`) using old column names
- Trigger functions with hardcoded column references

---

## Phase 2: Application Code Analysis

### 2.1: Lambda Database Call Audit

**Objective**: Find all Lambda code using non-standard column names in NEW modules only.

**Process:**
```bash
# Search Lambda Python files for workspace_id in NEW modules only
grep -r "workspace_id" --include="*.py" \
  templates/_modules-core/module-kb/backend/lambdas/ \
  templates/_modules-core/module-chat/backend/lambdas/ \
  templates/_modules-functional/module-eval/backend/lambdas/ \
  templates/_modules-functional/module-voice/backend/lambdas/ \
  templates/_modules-functional/module-ws/backend/lambdas/

# Search for knowledge_base_id in NEW modules only
grep -r "knowledge_base_id" --include="*.py" \
  templates/_modules-core/module-kb/backend/lambdas/ \
  templates/_modules-core/module-chat/backend/lambdas/ \
  templates/_modules-functional/module-eval/backend/lambdas/ \
  templates/_modules-functional/module-voice/backend/lambdas/ \
  templates/_modules-functional/module-ws/backend/lambdas/

# Find all database queries (org_common calls) in NEW modules only
grep -r "find_one\|find_many\|insert_one\|update_one" --include="*.py" \
  templates/_modules-core/module-kb/backend/lambdas/ \
  templates/_modules-core/module-chat/backend/lambdas/ \
  templates/_modules-functional/module-eval/backend/lambdas/ \
  templates/_modules-functional/module-voice/backend/lambdas/ \
  templates/_modules-functional/module-ws/backend/lambdas/
```

**Output**: `findings_lambda-queries.md`

**Expected Violations:**
- Lambda queries filtering by `workspace_id` (should be `ws_id`)
- org_common wrapper functions using old names
- Lambda logic expecting old column names

---

### 2.2: Frontend API Call Audit

**Objective**: Find frontend code using non-standard column names in NEW modules only.

**Process:**
```bash
# Search TypeScript/JavaScript for workspace_id in NEW modules only
grep -r "workspace_id" --include="*.ts" --include="*.tsx" \
  templates/_modules-core/module-kb/frontend/ \
  templates/_modules-core/module-chat/frontend/ \
  templates/_modules-functional/module-eval/frontend/ \
  templates/_modules-functional/module-voice/frontend/ \
  templates/_modules-functional/module-ws/frontend/

# Check for knowledge_base_id in NEW modules
grep -r "knowledge_base_id" --include="*.ts" --include="*.tsx" \
  templates/_modules-core/module-kb/frontend/ \
  templates/_modules-core/module-chat/frontend/ \
  templates/_modules-functional/module-eval/frontend/ \
  templates/_modules-functional/module-voice/frontend/ \
  templates/_modules-functional/module-ws/frontend/
```

**Output**: `findings_frontend-code.md`

**Expected Violations:**
- API request bodies with `workspace_id`
- TypeScript interfaces defining old column names
- Frontend state using inconsistent naming

---

## Phase 3: Dependency Mapping

### 3.1: Change Impact Analysis

**Objective**: Map dependencies between schema objects and code.

**Process:**
1. For each violated column name, identify:
   - Which tables have the column
   - Which RLS policies reference it
   - Which indexes are on it
   - Which FK constraints reference it
   - Which Lambda functions query it
   - Which frontend code uses it

2. Create dependency graph:
   ```
   kb_access_ws.workspace_id
   ├── RLS: kb_access_ws_admin (references ws_members.ws_id)
   ├── Index: idx_kb_access_ws_workspace_id
   ├── FK: fk_kb_access_ws_workspace_id REFERENCES workspaces(id)
   ├── Lambda: kb-processor/lambda_function.py (line 234)
   └── Frontend: apps/web/components/kb/KBAccessManager.tsx (line 89)
   ```

**Output**: `dependency-map.md`

---

### 3.2: Remediation Complexity Assessment

**Objective**: Estimate effort and risk for each remediation.

**Criteria:**
- **Low Complexity**: Column rename only, no breaking changes
- **Medium Complexity**: Column + RLS policy updates
- **High Complexity**: Column + RLS + Lambda + Frontend changes

**Output**: `remediation-complexity.md`

---

## Phase 4: Remediation Strategy

### 4.1: Migration Script Generation

**For Each Violated Column:**

```sql
-- Template migration script
-- Migration: {YYYY-MM-DD}_rename-{table}-{old_col}-to-{new_col}.sql

-- Step 1: Rename column
ALTER TABLE {table} RENAME COLUMN {old_col} TO {new_col};

-- Step 2: Drop and recreate RLS policies
DROP POLICY IF EXISTS "{policy_name}" ON {table};
CREATE POLICY "{policy_name}" ON {table}
    FOR ALL TO authenticated
    USING (
        {new_col} IN (
            SELECT ws_id FROM ws_members WHERE user_id = auth.uid()
        )
    );

-- Step 3: Recreate indexes
DROP INDEX IF EXISTS idx_{table}_{old_col};
CREATE INDEX idx_{table}_{new_col} ON {table}({new_col});

-- Step 4: Recreate foreign keys (if needed)
ALTER TABLE {table} DROP CONSTRAINT IF EXISTS fk_{table}_{old_col};
ALTER TABLE {table} ADD CONSTRAINT fk_{table}_{new_col}
    FOREIGN KEY ({new_col}) REFERENCES {ref_table}(id);

-- Step 5: Update functions referencing the column
-- (Manual updates required - document in migration notes)

-- Step 6: Reload schema cache
NOTIFY pgrst, 'reload schema';
```

**Output**: One migration file per violation (in `scripts/migrations/`)

---

### 4.2: Lambda Code Updates

**For Each Lambda File:**

1. Find all occurrences of old column name
2. Replace with new column name
3. Test the Lambda function
4. Update org_common if wrapper functions affected

**Example:**
```python
# Before:
doc = common.find_one('kb_docs', {
    'id': doc_id, 
    'workspace_id': workspace_id  # ❌ OLD
})

# After:
doc = common.find_one('kb_docs', {
    'id': doc_id, 
    'ws_id': workspace_id  # ✅ NEW (variable name can stay for now)
})
```

---

### 4.3: Frontend Code Updates

**For Each Frontend File:**

1. Update TypeScript interfaces
2. Update API request payloads
3. Update component props
4. Test UI workflows

**Example:**
```typescript
// Before:
interface KBAccess {
  workspace_id: string;  // ❌ OLD
}

// After:
interface KBAccess {
  ws_id: string;  // ✅ NEW
}
```

---

### 4.4: Schema File Updates

**For Each Schema File:**

1. Update base schema definitions
2. Update RLS policy files
3. Update index creation scripts
4. Verify consistency across modules

**Priority Order:**
1. Core modules (`module-kb`, `module-chat`, `module-ai`)
2. Functional modules (`module-eval`, `module-voice`, `module-ws`)
3. Project templates

---

## Phase 5: Testing & Deployment

### 5.1: Test Plan

**Per Violation Fix:**
1. **Schema Tests:**
   - Migration runs without errors
   - RLS policies allow correct access
   - Indexes are created successfully

2. **Lambda Tests:**
   - Database queries return correct results
   - No type mismatch errors
   - Performance unchanged

3. **Frontend Tests:**
   - UI workflows function correctly
   - API calls succeed
   - No console errors

4. **Integration Tests:**
   - End-to-end user workflows
   - Cross-module functionality
   - RLS enforcement verified

---

### 5.2: Deployment Sequence

**Recommended Order:**
1. **Batch 1:** Simple column renames (no RLS/Lambda changes)
2. **Batch 2:** Column + RLS policy updates
3. **Batch 3:** Column + RLS + Lambda changes
4. **Batch 4:** Full stack changes (schema + Lambda + frontend)

**Per Batch:**
1. Apply migrations to test database
2. Reload PostgREST schema cache
3. Deploy updated Lambdas
4. Deploy frontend changes
5. Test end-to-end
6. Apply to production

---

### 5.3: Rollback Strategy

**Per Migration:**
```sql
-- Rollback template
ALTER TABLE {table} RENAME COLUMN {new_col} TO {old_col};
-- Restore old policies, indexes, constraints
```

**Application Rollback:**
- Git revert commits
- Redeploy previous Lambda versions
- Redeploy previous frontend build

---

## Phase 6: Documentation Updates

### 6.1: Update Standards Documentation

- Clarify abbreviation usage in `standard_DATABASE-NAMING.md`
- Add examples of correct FK column naming
- Document approved abbreviation list

### 6.2: Update Module Documentation

- Update each module's schema documentation
- Update API documentation with correct column names
- Update example queries and code snippets

### 6.3: Create Migration Guide

- Document the naming standard migration process
- Provide checklist for future schema changes
- Include common pitfalls and how to avoid them

---

## Success Criteria

- [ ] All tables use abbreviated foreign key columns per standard
- [ ] All RLS policies reference correct column names
- [ ] All indexes use correct column names
- [ ] All Lambda queries use correct column names
- [ ] All frontend code uses correct column names
- [ ] All tests pass
- [ ] No 406 errors in production
- [ ] Documentation updated
- [ ] Migration guide published

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Schema Analysis | 2-3 days | None |
| Phase 2: App Code Analysis | 2-3 days | Phase 1 complete |
| Phase 3: Dependency Mapping | 1-2 days | Phases 1 & 2 complete |
| Phase 4: Remediation Strategy | 1-2 days | Phase 3 complete |
| Phase 5: Testing & Deployment | 3-5 days | Phase 4 complete |
| Phase 6: Documentation | 1-2 days | Phase 5 complete |
| **Total** | **10-17 days** | Sequential |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing functionality | Medium | High | Comprehensive testing, phased rollout |
| RLS policy errors | Medium | High | Test in sandbox first, verify auth |
| Performance degradation | Low | Medium | Monitor query performance, rollback ready |
| Frontend API breakage | Medium | High | Backend-first changes, API versioning |
| Data loss | Low | Critical | Database backups, test migrations |

---

## Next Steps

1. **User Approval**: Get sign-off on plan approach
2. **Start Phase 1**: Begin schema analysis
3. **Create Findings Documents**: Document all violations
4. **Review Findings**: Prioritize fixes based on impact
5. **Elaborate Remediation Plan**: Detail exact changes needed
6. **Execute Phased Rollout**: Fix batch by batch

---

**Document Status:** 📋 Ready for Review  
**Requires:** User approval to proceed with Phase 1  
**Expected Completion:** 2-3 weeks from approval
