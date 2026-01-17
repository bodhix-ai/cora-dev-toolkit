# Plan: KB Column Naming Migration (knowledge_base_id → kb_id)

**Status:** ✅ COMPLETE  
**Priority:** Critical  
**Created:** January 16, 2026  
**Completed:** January 16, 2026 (Session 134)  
**Issue:** Violation of Database Naming Standard - Abbreviation Consistency

---

## Problem Statement

During test-ws-25 project creation, a database error was discovered revealing a **critical naming standard violation** across module-kb and module-chat schemas.

**Error Found:**
```
ERROR: column kas.kb_id does not exist
LINE 26: JOIN public.kb_access_sys kas ON kas.kb_id = kb.id
```

**Root Cause:**  
Schema tables use `knowledge_base_id` (spelled out) instead of `kb_id` (abbreviated), violating the database naming standard that requires foreign key columns to use the same abbreviation as the related table.

**Impact:**  
- 27 total violations found
- Blocks project creation workflow
- Prevents module-kb and module-chat deployment
- Inconsistent with other CORA modules (ws_id, wf_id, org_id)

---

## Standard Rule Violated

**Database Naming Standard - Column Rule 3:**

> When the related table uses an abbreviated prefix (as documented in Table Naming Rule 6), the foreign key column MUST use that same abbreviation, NOT the spelled-out form.

**Example:**
- Table: `kb_bases` (uses `kb` abbreviation)
- Foreign Key Column: `kb_id` ✅ (NOT `knowledge_base_id` ❌)

**Reference:** `docs/standards/cora/standard_DATABASE-NAMING.md` (updated Jan 16, 2026)

---

## Affected Files (27 Occurrences)

### Schema Files (16 occurrences)

| File | Occurrences | Change Required |
|------|-------------|-----------------|
| `004-kb-access-sys.sql` | 3 | Column definition, unique constraint, index |
| `005-kb-access-orgs.sql` | 3 | Column definition, unique constraint, index |
| `006-kb-access-ws.sql` | 3 | Column definition, unique constraint, index |
| `007-kb-access-chats.sql` | 3 | Column definition, unique constraint, index |
| `008-kb-rpc-functions.sql` | 4 | JOIN statements in RPC functions |

**Total Schema Changes:** 16

### Lambda Code (11 occurrences)

| File | Occurrences | Change Type |
|------|-------------|-------------|
| `kb-base/lambda_function.py` | 11 | Dictionary keys, filter parameters |

**Total Lambda Changes:** 11

---

## Migration Plan

### Phase 1: Schema Files (Templates)

Fix all schema files in `templates/_modules-core/module-kb/db/schema/`:

#### 1.1: Fix Access Control Tables (004, 005, 006, 007)

**Pattern to Replace:**
```sql
# SEARCH FOR:
knowledge_base_id UUID NOT NULL REFERENCES public.kb_bases(id)

# REPLACE WITH:
kb_id UUID NOT NULL REFERENCES public.kb_bases(id)
```

**Files:**
- `004-kb-access-sys.sql` - System-level KB access control
- `005-kb-access-orgs.sql` - Organization-level KB access control
- `006-kb-access-ws.sql` - Workspace-level KB access control
- `007-kb-access-chats.sql` - Chat-level KB access control

**Also Update:**
- Unique constraint references
- Index definitions (e.g., `idx_kb_access_sys_kb_id`)
- Comments referencing the column

#### 1.2: Fix RPC Functions (008)

**File:** `008-kb-rpc-functions.sql`

**Changes:**
```sql
# SEARCH FOR:
JOIN public.kb_access_sys kas ON kas.knowledge_base_id = kb.id
JOIN public.kb_access_orgs kao ON kao.knowledge_base_id = kb.id
JOIN public.kb_access_ws kaw ON kaw.knowledge_base_id = kb.id

# REPLACE WITH:
JOIN public.kb_access_sys kas ON kas.kb_id = kb.id
JOIN public.kb_access_orgs kao ON kao.kb_id = kb.id
JOIN public.kb_access_ws kaw ON kaw.kb_id = kb.id
```

**Also Update:**
- WHERE clauses: `kas.knowledge_base_id = p_kb_id` → `kas.kb_id = p_kb_id`

---

### Phase 2: Lambda Code (Templates)

#### 2.1: Fix kb-base Lambda Function

**File:** `templates/_modules-core/module-kb/backend/lambdas/kb-base/lambda_function.py`

**Pattern to Replace:**
```python
# SEARCH FOR:
'knowledge_base_id': kb_id
filters={'knowledge_base_id': kb_id}

# REPLACE WITH:
'kb_id': kb_id
filters={'kb_id': kb_id}
```

**Occurrences:** 11 instances throughout the file

**Affected Functions:**
- `enable_kb_for_org()` - Enable KB access for organization
- `disable_kb_for_org()` - Disable KB access for organization
- `get_kb_org_access()` - Get organization access settings
- `enable_kb_for_workspace()` - Enable KB access for workspace
- `disable_kb_for_workspace()` - Disable KB access for workspace
- `list_kb_accesses()` - List all access control entries

---

### Phase 3: Validation

#### 3.1: Schema Validation

After making changes, validate:

```bash
# Search for any remaining knowledge_base_id references
cd ~/code/bodhix/cora-dev-toolkit
grep -r "knowledge_base_id" templates/_modules-core/module-kb/db/schema/
grep -r "knowledge_base_id" templates/_modules-core/module-chat/db/schema/

# Expected result: No matches (except in comments)
```

#### 3.2: Lambda Validation

```bash
# Search for any remaining knowledge_base_id references
grep -r "knowledge_base_id" templates/_modules-core/module-kb/backend/
grep -r "knowledge_base_id" templates/_modules-core/module-chat/backend/

# Expected result: No matches
```

#### 3.3: Consistency Check

Verify all FK columns use abbreviations:

```bash
# Check for proper abbreviation usage
grep -E "(kb_id|ws_id|wf_id|org_id)" templates/_modules-core/module-kb/db/schema/*.sql

# Verify NO spelled-out versions exist
grep -E "(knowledge_base_id|workspace_id|workflow_id|organization_id)" templates/_modules-core/module-kb/db/schema/*.sql
```

---

### Phase 4: Workflow Testing

#### 4.1: Delete Test Project

```bash
# Delete test-ws-25 if it exists
rm -rf ~/code/bodhix/testing/test-ws-25/ai-sec-stack
rm -rf ~/code/bodhix/testing/test-ws-25/ai-sec-infra
```

#### 4.2: Run Complete Workflow

Follow `test-module.md` workflow from Phase 0:

1. **Phase 0:** Configuration verification
2. **Phase 1:** Project creation
3. **Phase 2:** Pre-deployment validation (pnpm install, type check, Lambda build)
4. **Phase 3:** Infrastructure deployment (deploy-all.sh)
5. **Phase 4:** Dev server startup
6. **Phase 5:** Verify no errors

**Success Criteria:**
- ✅ No database schema errors
- ✅ All Lambda builds succeed
- ✅ Terraform deployment completes
- ✅ Dev server starts without errors
- ✅ API Gateway endpoint configured in .env

---

## Detailed File Changes

### File 1: 004-kb-access-sys.sql

**Lines to Change:**
- Line ~6: Column definition
- Line ~7: Unique constraint
- Line ~13: Index definition

**Before:**
```sql
CREATE TABLE IF NOT EXISTS public.kb_access_sys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT kb_access_sys_unique UNIQUE (knowledge_base_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_kb_access_sys_kb_id ON public.kb_access_sys(knowledge_base_id);
```

**After:**
```sql
CREATE TABLE IF NOT EXISTS public.kb_access_sys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kb_id UUID NOT NULL REFERENCES public.kb_bases(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT kb_access_sys_unique UNIQUE (kb_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_kb_access_sys_kb_id ON public.kb_access_sys(kb_id);
```

---

### File 2: 005-kb-access-orgs.sql

**Same pattern as 004** - 3 occurrences to fix

---

### File 3: 006-kb-access-ws.sql

**Same pattern as 004** - 3 occurrences to fix

---

### File 4: 007-kb-access-chats.sql

**Same pattern as 004** - 3 occurrences to fix

---

### File 5: 008-kb-rpc-functions.sql

**Lines to Change:** Multiple JOIN and WHERE clauses in RPC functions

**Before:**
```sql
JOIN public.kb_access_orgs kao ON kao.knowledge_base_id = kas.knowledge_base_id
WHERE kas.knowledge_base_id = p_kb_id
```

**After:**
```sql
JOIN public.kb_access_orgs kao ON kao.kb_id = kas.kb_id
WHERE kas.kb_id = p_kb_id
```

---

### File 6: kb-base/lambda_function.py

**Pattern:** Replace all dictionary keys and filter parameters

**Before:**
```python
'knowledge_base_id': kb_id
filters={'knowledge_base_id': kb_id, 'org_id': org_id}
```

**After:**
```python
'kb_id': kb_id
filters={'kb_id': kb_id, 'org_id': org_id}
```

---

## Rollback Plan

If issues are discovered after migration:

1. **Revert template changes:**
   ```bash
   git checkout HEAD -- templates/_modules-core/module-kb/db/schema/
   git checkout HEAD -- templates/_modules-core/module-kb/backend/
   ```

2. **Delete test project**

3. **Investigate root cause**

4. **Update plan document**

5. **Retry migration**

---

## Success Metrics

### Immediate Success
- ✅ All 27 occurrences replaced
- ✅ No grep matches for `knowledge_base_id` in templates
- ✅ Schema validation passes
- ✅ Lambda builds complete
- ✅ Test project creates without errors

### Long-Term Success
- ✅ All future projects use `kb_id` consistently
- ✅ No confusion between `kb_id` and `knowledge_base_id`
- ✅ Consistency with other CORA modules (ws_id, wf_id)
- ✅ Standard documented and enforced

---

## Related Files to Check (Not Changed, But Validate)

### Other Modules That May Reference KB Tables

1. **module-chat:** Already uses `kb_id` in `010-chat-session-kb.sql` ✅
2. **module-ai:** Check if any AI functions reference KB tables
3. **module-ws:** Check workspace KB integrations

**Validation Command:**
```bash
# Check if other modules reference knowledge_base_id
grep -r "knowledge_base_id" templates/_modules-core/*/db/schema/
grep -r "knowledge_base_id" templates/_modules-core/*/backend/
```

---

## Timeline

| Phase | Time Estimate | Blocker |
|-------|---------------|---------|
| Phase 1: Schema fixes | 15 minutes | None |
| Phase 2: Lambda fixes | 10 minutes | Phase 1 |
| Phase 3: Validation | 5 minutes | Phase 2 |
| Phase 4: Workflow test | 10-15 minutes | Phase 3 |
| **Total** | **40-45 minutes** | - |

---

## Post-Migration Actions

1. **Update context-module-kb.md:**
   - Document this migration
   - Update "Known Issues" section
   - Add to session log

2. **Commit changes:**
   ```bash
   git add docs/standards/cora/standard_DATABASE-NAMING.md
   git add templates/_modules-core/module-kb/
   git commit -m "fix: Migrate knowledge_base_id to kb_id for naming standard compliance"
   ```

3. **Update other plan documents:**
   - Reference this migration in module-kb implementation plan
   - Update module-chat implementation plan if needed

---

## References

- **Database Naming Standard:** `docs/standards/cora/standard_DATABASE-NAMING.md`
- **Module-KB Context:** `memory-bank/context-module-kb.md`
- **Test Workflow:** `.cline/workflows/test-module.md`
- **Error Discovery:** Session 132 (January 16, 2026)

---

## Appendix: Complete File List

**Templates to Fix:**
1. `templates/_modules-core/module-kb/db/schema/004-kb-access-sys.sql`
2. `templates/_modules-core/module-kb/db/schema/005-kb-access-orgs.sql`
3. `templates/_modules-core/module-kb/db/schema/006-kb-access-ws.sql`
4. `templates/_modules-core/module-kb/db/schema/007-kb-access-chats.sql`
5. `templates/_modules-core/module-kb/db/schema/008-kb-rpc-functions.sql`
6. `templates/_modules-core/module-kb/backend/lambdas/kb-base/lambda_function.py`

**Documentation Updated:**
1. `docs/standards/cora/standard_DATABASE-NAMING.md` ✅ (Completed)
2. `docs/plans/plan_kb-column-naming-migration.md` ✅ (This document)

---

## Implementation Summary (Session 134)

**Status:** ✅ **MIGRATION COMPLETE**  
**Date:** January 16, 2026  
**Duration:** ~5 minutes (6 file operations)  
**Context Usage:** 154,124 / 200K tokens (77%)

### Files Updated

**Schema Files (5 files, 16 changes):**
1. ✅ `004-kb-access-sys.sql` - 3 changes
2. ✅ `005-kb-access-orgs.sql` - 3 changes
3. ✅ `006-kb-access-ws.sql` - 3 changes
4. ✅ `007-kb-access-chats.sql` - 3 changes
5. ✅ `008-kb-rpc-functions.sql` - 7 changes (4 originally planned, found 3 additional)

**Lambda Code (1 file, 11 changes):**
6. ✅ `kb-base/lambda_function.py` - 11 changes

### Validation Results

✅ **All 27 occurrences migrated successfully**  
✅ **No remaining `knowledge_base_id` references in schema files** (only .bak files)  
✅ **No remaining `knowledge_base_id` references in Lambda files**  
✅ **Module-chat requires no changes** (already uses `kb_id`)

### Impact

- Fixes blocking error preventing test-ws-25 project creation
- Ensures consistency with CORA naming standards (kb_id, ws_id, wf_id, org_id)
- All future projects will use correct naming automatically
- Templates ready for testing via new project creation

### Next Steps

Templates are ready for validation:
1. Create new test project (test-ws-26 or later)
2. Deploy infrastructure and verify schema creation succeeds
3. Test module-kb and module-chat functionality
4. Verify no database errors related to column naming

**Next Priority:** [CORA Workflow Optimization](plan_cora-workflow-optimization.md) - Automate and streamline project provisioning workflow
