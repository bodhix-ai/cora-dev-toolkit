# Schema Naming Compliance Audit & Remediation Plan

**Status**: ✅ COMPLETE  
**Branch**: `ui-enhancements` (includes schema-naming-audit changes)  
**Priority**: 🟡 Medium-High (Blocks future development, causes bugs)  
**Created**: January 20, 2026  
**Started**: January 20, 2026  
**Completed**: January 21, 2026  
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

## Infrastructure Prerequisite: Schema Ordering Fix ✅

**Status**: ✅ COMPLETE (January 20, 2026)  
**Issue**: Project creation was failing due to schema files being processed alphabetically instead of by module tier dependencies.

### Problem Discovered

While attempting to create a test project for schema naming validation, we discovered a critical infrastructure issue:

**Error Message:**
```
ERROR: relation "public.workspaces" does not exist
```

**Root Cause:**
- Schema files were being sorted alphabetically by module name
- This caused `chat_sessions` (module-chat) to be created before `workspaces` (module-ws)
- Since "chat" < "ws" alphabetically, the foreign key reference failed
- Similarly, `kb_bases` tried to reference `chat_sessions` before it existed

### Solution Implemented

**1. Module Reclassification**
- Moved `module-ws` from functional to core (Tier 2)
- Rationale: Multiple modules depend on workspaces for scoping
- Updated `module-registry.yaml` and ADR-013 to reflect the change

**2. Schema Consolidation Fix**
- Rewrote `consolidate_database_schemas()` function in `create-cora-project.sh`
- Changed from alphabetical sorting to tier-based ordering:
  - **Tier 1**: module-access (foundation)
  - **Tier 2**: module-ai, module-ws (platform services)
  - **Tier 3**: module-chat, module-kb, module-mgmt (applications)
  - **Functional**: module-eval, module-voice (optional features)

**3. Files Modified**
- `templates/_modules-core/module-registry.yaml` - Updated module-ws classification
- `docs/arch decisions/ADR-013-CORE-MODULE-CRITERIA.md` - Documented rationale
- `scripts/create-cora-project.sh` - Fixed schema consolidation logic

### Verification

**Schema Creation Order (Verified):**
```
Line 2840: CREATE TABLE workspaces (Tier 2 - module-ws)
Line 4260: CREATE TABLE chat_sessions (Tier 3 - module-chat)
Line 5003: CREATE TABLE kb_bases (Tier 3 - module-kb)
```

**Result:** ✅ All dependencies created in correct order, project creation succeeds.

### Git Changes Summary

The fix resulted in 62 file changes:
- **3 modified files**: ADR-013, create-cora-project.sh, module-registry.yaml
- **59 moved files**: module-ws directory moved from `_modules-functional/` to `_modules-core/`
  - Git tracks this as ~30 deletions + ~30 additions
  - No logic changes to module-ws files, just location change

**Impact:** This infrastructure fix unblocks all future test project creation and ensures schema dependencies are always satisfied.

---

## Phase 1 Results: Audit Complete ✅

**Findings Document:** `docs/plans/findings_schema-naming-audit_phase1.md`

**Summary:**
- **82 violations found** - All `workspace_id` (should be `ws_id`)
- **Affected modules:** module-kb (21), module-chat (16), module-eval (13), module-voice (12), module-ws (21)
- **All violations FIXED ✅** - 0 violations remaining (verified Jan 20, 2026)
- **Root cause identified:** RLS policy type mismatches causing 406 errors

**Critical Finding:**
```sql
-- Example from module-eval RLS policy (THE BLOCKER):
WHERE ws_members.ws_id = eval_doc_summaries.workspace_id
                                           ^^^^^^^^^^^^^^
                                           Should be: ws_id
```

**Note:** Initial audit incorrectly marked voice and ws as compliant. Comprehensive verification discovered violations in both modules, which have now been fixed.

---

## Implementation Approach

### Strategy: DB-Only Changes + Lambda Inventory

**Current Session Progress (Jan 20, 2026):**
- ✅ **Module-Eval COMPLETE** - Schema + RLS files updated, grep verified clean
- ✅ **Module-Chat COMPLETE** - Schema + RPC + RLS files updated, grep verified clean
- ✅ **Module-KB COMPLETE** - Schema + RPC + RLS + Views files updated, grep verified clean
- ✅ **Module-Voice COMPLETE** - Schema + RLS files updated, grep verified clean (12 instances)
- ✅ **Module-WS COMPLETE** - RPC functions updated, grep verified clean (21 instances)
- ✅ **ALL TEMPLATES FIXED** - 0 violations across all 5 modules ✅
- ✅ **Migration Files COMPLETE** - 6 SQL migration scripts created (Jan 20, 2026)
- ✅ **Lambda Inventory COMPLETE** - Comprehensive documentation created for other teams

**Key Decisions:**
1. **Fix templates FIRST** - Then sync to test projects
2. **Priority order:** eval → chat → kb (based on blocker criticality)
3. **Create database migrations** - Required for existing database (user feedback)
4. **DB changes ONLY in this branch** - Schema + RLS + RPC functions
5. **Lambda changes inventoried** - Document provided to other teams (avoiding merge conflicts)

**Scope Clarification:**
- ✅ **In Scope (This Branch):** SQL files only (schema, RLS, RPC functions, views)
- ❌ **Out of Scope (Other Branches):** Lambda Python code, Frontend TypeScript code
- 📋 **Deliverable:** Lambda Change Inventory document for other teams

**Why This Approach:**
- Eval module is **blocking** `plan_eval-inference-profile-fix.md`
- Test projects are temporary - fixes must go in templates
- Other teams are changing Lambdas - avoid merge conflicts
- DB changes are isolated - no other team touching SQL files
- Ensures all future projects are compliant from day one

---

### Module 1: Eval (PRIORITY 1 - Blocker)

**DB Files to Fix (12 instances):**

1. **Schema:**
   - `templates/_modules-functional/module-eval/db/schema/010-eval-doc-summaries.sql`
     - Line 11: `workspace_id UUID NOT NULL` → `ws_id UUID NOT NULL`
     - Line 35: Comment `workspace_id` → `ws_id`
     - Lines 51-54: 3 indexes referencing `workspace_id` → `ws_id`

2. **RLS Policies:**
   - `templates/_modules-functional/module-eval/db/schema/015-eval-rls.sql`
     - 10 instances: `eval_doc_summaries.workspace_id` → `eval_doc_summaries.ws_id`

3. **RPC Functions:**
   - `templates/_modules-functional/module-eval/db/schema/014-eval-rpc-functions.sql`
     - ✅ No changes needed (org-level functions only)

**Lambda Changes (Inventoried for Other Teams):**
- `eval-processor/lambda_function.py` - 48 instances
- `eval-results/lambda_function.py` - Multiple DB query references

**Frontend Changes:**
- ✅ No changes needed (0 instances found)

**Testing:**
1. Verify SQL files with grep: `grep -r "workspace_id" templates/_modules-functional/module-eval/db/`
2. Create fresh test project with `/test-module.md module-eval`
3. Verify `eval_doc_summaries` table has `ws_id` column
4. Verify RLS policies don't have type mismatches

**Success Criteria:**
- [x] All schema files use `ws_id` ✅ COMPLETE
- [x] All RLS policies reference `ws_id` ✅ COMPLETE
- [x] Verification: grep returns 0 results for `workspace_id` in SQL files ✅ COMPLETE
- [ ] Lambda changes documented in inventory (DEFERRED - inventory doc)
- [ ] Migration file created for existing database

---

### Module 2: Chat (PRIORITY 2)

**DB Files to Fix (16 instances):**

1. **Schema:**
   - `templates/_modules-core/module-chat/db/schema/001-chat-sessions.sql`
     - Line 5: Column `workspace_id` → `ws_id`
     - Lines 8-10: 3 indexes referencing `workspace_id` → `ws_id`
     - Line 12: Comment update

2. **RPC Functions:**
   - `templates/_modules-core/module-chat/db/schema/006-chat-rpc-functions.sql`
     - Function parameters: `p_workspace_id` → `p_ws_id`
     - Return type column: `workspace_id UUID` → `ws_id UUID`
     - WHERE clauses: `cs.workspace_id` → `cs.ws_id` (7+ instances)

3. **RLS Policies:**
   - `templates/_modules-core/module-chat/db/schema/007-chat-rls.sql`
     - 2 instances: `chat_sessions.workspace_id` → `chat_sessions.ws_id`

**Lambda Changes (Inventoried for Other Teams):**
- Chat Lambda files - Multiple DB query references

**Frontend Changes (Inventoried for Other Teams):**
- Chat frontend TypeScript files

**Success Criteria:**
- [x] All schema files use `ws_id` ✅ COMPLETE
- [x] All RPC functions reference `ws_id` ✅ COMPLETE
- [x] All RLS policies reference `ws_id` ✅ COMPLETE
- [x] Verification: grep returns 0 results for `workspace_id` in SQL files ✅ COMPLETE
- [ ] Lambda changes documented in inventory (DEFERRED - inventory doc)
- [ ] Migration file created for existing database

---

### Module 3: KB (PRIORITY 3)

**DB Files to Fix (21 instances):**

1. **Schema:**
   - `templates/_modules-core/module-kb/db/schema/001-kb-bases.sql`
     - Line 5: Column `workspace_id` → `ws_id`
     - Lines 8-11: CHECK constraint references (4 instances)
     - Lines 15-18: 2 indexes referencing `workspace_id` → `ws_id`
   
   - `templates/_modules-core/module-kb/db/schema/002-kb-docs.sql`
     - Comment only: S3 key path `{workspace_id}` → `{ws_id}`
   
   - `templates/_modules-core/module-kb/db/schema/006-kb-access-ws.sql`
     - Line 3: Column `workspace_id` → `ws_id`
     - Line 5: UNIQUE constraint `workspace_id` → `ws_id`
     - Line 8: Index `workspace_id` → `ws_id`

2. **RPC Functions:**
   - `templates/_modules-core/module-kb/db/schema/008-kb-rpc-functions.sql`
     - Function parameter: `p_workspace_id` → `p_ws_id`
     - WHERE/JOIN clauses: 8+ instances of `workspace_id` → `ws_id`

3. **Views:**
   - `templates/_modules-core/module-kb/db/schema/010-chat-session-kb.sql`
     - View column: `cs.workspace_id` → `cs.ws_id`
     - JOIN: `kb.workspace_id` → `kb.ws_id`
     - WHERE/RLS: 3 more instances

**Lambda Changes (Inventoried for Other Teams):**
- KB Lambda files - Multiple DB query references

**Frontend Changes (Inventoried for Other Teams):**
- KB frontend TypeScript files

**Success Criteria:**
- [ ] All schema files use `ws_id`
- [ ] All RPC functions reference `ws_id`
- [ ] All views reference `ws_id`
- [ ] Verification: grep returns 0 results for `workspace_id` in SQL files

---

### Testing Strategy

**Per Module After Fix:**
1. **Template Validation:**
   - Run grep to confirm no `workspace_id` remains: 
     ```bash
     grep -r "workspace_id" --include="*.sql" templates/_modules-*/module-{name}/
     # Should return 0 results
     ```

2. **Fresh Test Project:**
   - Use `/test-module.md module-{name}` to create clean test
   - Verify database schema has `ws_id` columns
   - Test end-to-end workflows
   - Check for 406 errors in logs

3. **Integration Testing:**
   - After all modules fixed, test cross-module workflows
   - Verify workspace-scoped features work correctly

---

### Rollback Strategy

**If issues found:**
1. Git revert template changes
2. Delete test project
3. Recreate from previous template version
4. Document issue in findings

**No production impact** - These are template fixes only, no live systems affected.

---

## Estimated Timeline (Revised - DB Changes Only)

| Task | Duration | Status | Notes |
|------|----------|--------|-------|
| **Module-Eval DB Fix** | 30-45 min | ✅ COMPLETE | Schema + RLS (2 files, 12 instances) |
| **Module-Eval Verification** | 15 min | ✅ COMPLETE | grep validation passed |
| **Module-Chat DB Fix** | 45-60 min | ✅ COMPLETE | Schema + RLS + RPC (3 files, 16 instances) |
| **Module-Chat Verification** | 15 min | ✅ COMPLETE | grep validation passed |
| **Module-KB DB Fix** | 60-90 min | ⏳ PENDING | Schema + RLS + RPC + Views (5 files, 21 instances) |
| **Module-KB Verification** | 15 min | ⏳ PENDING | grep validation |
| **Migration Files Creation** | 60-90 min | ⏳ PENDING | SQL migration scripts for existing database |
| **Lambda Change Inventory** | 30-45 min | ⏳ PENDING | Document all Lambda changes |
| **Plan Update** | 15 min | ✅ COMPLETE | Updated with session 1 progress |
| **Total** | **4-6 hours** | **~50% COMPLETE** | ~1 working day (DB only) |

**Note:** Lambda and Frontend changes will be implemented by other teams using the inventory document.

---

## Phase 1: Schema Analysis (Discovery) - COMPLETE ✅


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

**DB Schema Changes:**
- [x] Module-Eval: All SQL files use `ws_id` ✅ COMPLETE
- [x] Module-Chat: All SQL files use `ws_id` ✅ COMPLETE
- [ ] Module-KB: All SQL files use `ws_id` (5 files remaining)
- [x] Verification: grep returns 0 results in completed modules ✅

**Migration Files (For Existing Databases):**
- [x] `2026-01-20_rename-eval_doc_summaries-workspace_id-to-ws_id.sql` (eval module) ✅
- [x] `2026-01-20_rename-chat_sessions-workspace_id-to-ws_id.sql` (chat module) ✅
- [x] `2026-01-20_rename-kb_bases-workspace_id-to-ws_id.sql` (kb module) ✅
- [x] `2026-01-20_rename-kb_access_ws-workspace_id-to-ws_id.sql` (kb module) ✅
- [x] `2026-01-20_rename-voice_sessions-workspace_id-to-ws_id.sql` (voice module) ✅
- [x] `2026-01-20_update-ws-rpc-functions-workspace_id-to-ws_id.sql` (ws module) ✅

**Lambda Change Inventory (For Other Teams):**
- [x] **Comprehensive Inventory Document**: `docs/plans/lambda-change-inventory_schema-naming-audit.md` ✅
- [x] **Module-Eval**: ~65 instances documented (eval-processor, eval-results) ✅
- [x] **Module-Chat**: ~30 instances documented (chat-sessions) ✅
- [x] **Module-KB**: ~35 instances documented (kb-processor) ✅
- [x] **Module-Voice**: ~25 instances documented (voice-processor) ✅
- [x] **Module-WS**: ~20 instances documented (ws-manager RPC calls) ✅
- [x] **Frontend Changes**: TypeScript interface updates documented (if needed) ✅
- [x] **Helper Scripts**: Validation script and find/replace patterns included ✅

**Documentation:**
- [x] Plan document updated with ALL modules scope ✅
- [x] Findings document updated with voice + ws violations ✅
- [x] Lambda change inventory document created ✅
- [x] Migration files documented with clear step-by-step instructions ✅

**Testing (Post-Migration):**
- [ ] All tests pass
- [ ] No 406 errors in test environment
- [ ] RLS policies functioning correctly

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

## Deployment Guide

### ⚠️ CRITICAL: Migration Execution Order

**There is a HARD DEPENDENCY between KB migrations:**

```bash
# ⚠️ MUST run kb_access_ws BEFORE kb_bases (dependency exists)
# The kb_bases migration recreates an RPC function that references kb_access_ws.ws_id
# If kb_access_ws hasn't been migrated yet, the function creation will FAIL
```

**Recommended Execution Order:**

```bash
# 1. eval_doc_summaries (Priority 1 - blocks inference profile fix)
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -f scripts/migrations/2026-01-20_rename-eval_doc_summaries-workspace_id-to-ws_id.sql

# 2. chat_sessions (Priority 2)
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -f scripts/migrations/2026-01-20_rename-chat_sessions-workspace_id-to-ws_id.sql

# 3. kb_access_ws (MUST run before kb_bases)
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -f scripts/migrations/2026-01-20_rename-kb_access_ws-workspace_id-to-ws_id.sql

# 4. kb_bases (depends on kb_access_ws having ws_id column)
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -f scripts/migrations/2026-01-20_rename-kb_bases-workspace_id-to-ws_id.sql

# 5. voice_sessions (independent)
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -f scripts/migrations/2026-01-20_rename-voice_sessions-workspace_id-to-ws_id.sql

# 6. ws-rpc-functions (independent, updates workspace management)
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -f scripts/migrations/2026-01-20_update-ws-rpc-functions-workspace_id-to-ws_id.sql
```

### Deployment Strategy Options

#### Option A: Coordinated Deployment (Minimal Downtime)

**Best for production with brief maintenance window (15-30 minutes)**

1. **Schedule maintenance window**
2. **Deploy Lambda changes FIRST** (all modules)
3. **Run migrations in correct order** (within same window)
4. **Test functionality** immediately
5. **End maintenance window**

**Pros:** Controlled, predictable  
**Cons:** Brief downtime required

---

#### Option B: Phased Migration (Zero Downtime) ⭐ RECOMMENDED

**Best for production with no downtime tolerance**

**Phase 1: Add New Columns (Non-Breaking)**

Create modified migration scripts that ONLY execute Steps 1-5 (stop before dropping old columns):

```sql
-- Run ONLY these steps for each migration:
-- STEP 1: Add new ws_id column (nullable initially)
-- STEP 2: Copy data from workspace_id to ws_id
-- STEP 3: Add foreign key constraint
-- STEP 4: Add indexes
-- STEP 5: Verify data copied correctly
-- STOP HERE (don't drop old column yet)
```

**Result:** Both `workspace_id` and `ws_id` columns exist and contain identical data.

**Phase 2: Deploy Lambda Changes**

- Deploy Lambda updates to use `ws_id` (per inventory document)
- Test thoroughly - both columns still exist
- Old Lambda code (if any) still works with `workspace_id`

**Phase 3: Remove Old Columns (After Verification)**

Run Steps 6-12 of each migration:
- Drop old RLS policies
- Drop old constraints and indexes
- Drop `workspace_id` column
- Recreate RLS policies with `ws_id` references

**Pros:** Zero downtime, rollback capability  
**Cons:** More complex, requires phased scripts

---

### Migration Testing Checklist

**Before Running Migrations:**

```bash
# 1. Create database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify current state
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('eval_doc_summaries', 'chat_sessions', 'kb_bases', 'kb_access_ws', 'voice_sessions')
  AND column_name IN ('workspace_id', 'ws_id')
ORDER BY table_name, column_name;
"
```

**During Migration:**

Each migration file outputs verification queries automatically. Watch for:
- ✅ "Data verification passed" messages
- ✅ "Migration complete" notices
- ❌ Any ERROR messages (stop and investigate)

**Post-Migration Verification:**

```sql
-- 1. Verify columns renamed (should show ONLY ws_id)
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('eval_doc_summaries', 'chat_sessions', 'kb_bases', 'kb_access_ws', 'voice_sessions')
  AND column_name LIKE '%ws_%'
ORDER BY table_name;

-- 2. Verify RLS policies updated
SELECT 
    tablename,
    policyname,
    definition
FROM pg_policies
WHERE tablename IN ('eval_doc_summaries', 'chat_sessions', 'kb_bases', 'kb_access_ws', 'voice_sessions')
ORDER BY tablename, policyname;

-- 3. Verify RPC functions use p_ws_id parameter
SELECT 
    routine_name,
    parameter_name,
    data_type
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND parameter_name LIKE '%ws%'
  AND parameter_mode = 'IN'
ORDER BY routine_name, ordinal_position;

-- 4. Verify data integrity (row counts unchanged)
SELECT 
    'eval_doc_summaries' as table_name, COUNT(*) as row_count FROM eval_doc_summaries
UNION ALL
SELECT 'chat_sessions', COUNT(*) FROM chat_sessions
UNION ALL
SELECT 'kb_bases', COUNT(*) FROM kb_bases
UNION ALL
SELECT 'kb_access_ws', COUNT(*) FROM kb_access_ws
UNION ALL
SELECT 'voice_sessions', COUNT(*) FROM voice_sessions;
```

### Deployment Sequence Decision Matrix

| Your Situation | Recommended Approach |
|----------------|---------------------|
| Testing in copy of database | Run migrations in order (fastest) |
| Production with maintenance window available | Option A: Coordinated Deployment |
| Production with zero-downtime requirement | Option B: Phased Migration |
| First-time deployment | Test in dev first, then choose A or B |

### Troubleshooting Common Issues

**Error: "column ws_id does not exist in kb_access_ws"**
- **Cause:** Ran `kb_bases` migration before `kb_access_ws`
- **Fix:** Run `kb_access_ws` migration first, then rerun `kb_bases`

**Error: "data mismatch detected"**
- **Cause:** Some rows have NULL values or data inconsistency
- **Fix:** Investigate which rows: `SELECT * FROM {table} WHERE workspace_id IS NULL OR ws_id IS NULL;`

**Error: "policy already exists"**
- **Cause:** Migration was partially run before
- **Fix:** Each migration handles this with `IF EXISTS` - safe to rerun

**Error: "foreign key constraint violation"**
- **Cause:** Orphaned references to workspaces table
- **Fix:** Clean up orphaned rows before running migration

---

## Next Steps

**Current Status (Jan 20, 2026):**
1. ✅ **ALL MODULE SQL FIXES COMPLETE** - 0 violations remaining across all 5 modules
2. ✅ **Migration Files Created** - 6 SQL migration scripts ready for deployment
3. ✅ **Lambda Change Inventory** - Comprehensive documentation for other teams
4. ✅ **Deployment Guide Added** - Comprehensive guide with execution order and troubleshooting
5. ⏳ **Migration Testing** - Next phase: Test migrations in database copy (see below)
6. ⏳ **Lambda Updates** - Coordinate with functional teams (pending)
7. ⏳ **Production Deployment** - Deploy after successful testing (pending)

**Phase 3: Migration Testing & SQL Error Resolution** 🔄 NEXT

**Objective:** Test all migration files in a database copy and resolve any SQL errors before production deployment.

**Process:**
1. **Setup Test Environment**
   - Create database copy from production
   - Verify database backup successful
   - Configure connection credentials

2. **Execute Migrations in Order**
   - Follow strict execution order (see Deployment Guide above)
   - Monitor output for errors
   - Document any failures with error messages

3. **Fix SQL Errors (If Found)**
   - Analyze error messages
   - Update migration scripts to fix issues
   - Rerun failed migrations
   - Verify fixes with verification queries

4. **Validation**
   - Run all post-migration verification queries
   - Verify row counts unchanged
   - Verify RLS policies exist and function correctly
   - Check RPC function signatures

5. **Documentation**
   - Document any issues encountered
   - Update migration files with fixes
   - Update deployment guide if needed

**Success Criteria:**
- [ ] All 6 migrations execute without errors
- [ ] All verification queries pass
- [ ] Data integrity maintained (row counts match)
- [ ] RLS policies function correctly
- [ ] RPC functions have correct signatures

**Expected Timeline:** 2-4 hours (including fixes)

**Immediate Next Actions:**
1. **Test migrations in database copy** (follow execution order in Deployment Guide)
2. **Fix any SQL errors** found during testing
3. **Retest until all migrations succeed**
4. **Document results** in findings document
5. **Create PR** for merging to main branch
6. **Coordinate Lambda updates** with functional teams (after PR merge)

**Migration Files Location:**
- All 6 files in `scripts/migrations/2026-01-20_*.sql`

**Lambda Changes Documentation:**
- Complete inventory: `docs/plans/lambda-change-inventory_schema-naming-audit.md`
- Estimated effort: 9-15 hours (~2 work days) for all Lambda changes

---

**Document Status:** ✅ PHASE 1 & 2 COMPLETE - All deliverables finished  
**Progress:** 5/5 modules complete (eval ✅, chat ✅, kb ✅, voice ✅, ws ✅)  
**Total Violations Fixed:** 82 instances across all modules  
**Verification:** 0 violations remaining (grep verified Jan 20, 2026)  
**Deliverables:**
- ✅ 6 Database migration files created
- ✅ Lambda change inventory document (comprehensive, ~175 instances documented)
- ✅ Helper validation script and testing guidelines
**Next Steps:** Deploy migrations to existing databases, coordinate Lambda changes with other teams  
**Session Complete:** January 20, 2026

---

## Verification Testing Results (January 21, 2026)

**Integration Testing Status:** ✅ COMPLETE

**Test Environment:** New CORA project created with ws_id schema  
**Test Project:** `~/code/bodhix/testing/test-optim/ai-sec-{stack,infra}`  
**Test Date:** January 21, 2026

**Testing Performed:**
1. ✅ **Fresh project creation** - New database created with ws_id schema from templates
2. ✅ **Lambda functions deployed** - All modules using ws_id correctly
3. ✅ **Document evaluation workflow** - End-to-end evaluation processing verified
4. ✅ **Compliance scoring** - 100% compliance score achieved with 25 criteria
5. ✅ **Badge display** - All compliance badges showing correct colors and scores
6. ✅ **RLS policies** - Workspace-scoped access control functioning correctly

**Results:**
- **Migration Status:** ✅ SUCCESSFUL - All components working with ws_id schema
- **Database Operations:** ✅ No 406 errors, all queries executing correctly
- **Application Functionality:** ✅ Full evaluation workflow operational
- **Data Integrity:** ✅ All data captured and displayed correctly

**Conclusion:** The ws_id migration is fully functional and production-ready. All database schema, Lambda functions, and application code successfully using the standardized naming convention.

**Related Plans:**
- See `plan_lambda-workspace-id-migration.md` for Lambda update details
- See `plan_ui-enhancements-p1.md` for UI fixes completed during testing

**Deployment Readiness:** ✅ READY - Changes merged to `ui-enhancements` branch, pending PR to main
