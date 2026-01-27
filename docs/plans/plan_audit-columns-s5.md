# Sprint Plan: Audit Column Compliance S5

**Status:** 🟡 PLANNED  
**Branch:** `fix/audit-columns-s5` (to be created)  
**Initiative:** Error Remediation & Clean Baseline  
**Context:** [`memory-bank/context-error-remediation.md`](../../memory-bank/context-error-remediation.md)  
**Created:** January 27, 2026

---

## Sprint Goal

Achieve full audit column compliance across all entity tables by implementing ADR-015 standards for soft delete support, audit tracking, and proper indexing.

**Targets:**
- 8 non-compliant tables → 0 non-compliant tables
- Audit Column Validator: FAIL → PASS
- Compliance Rate: 0% → 100%

---

## Scope

### IN SCOPE (All 8 Non-Compliant Tables)

**Compliance Requirements (ADR-015):**
1. Standard audit columns: created_at, updated_at, created_by, updated_by
2. Soft delete support: is_deleted, deleted_at, deleted_by
3. Proper indexes for soft delete queries
4. Triggers for syncing is_deleted flag with deleted_at

**Non-Compliant Tables (Priority Order):**

#### 1. module-access Tables (3 tables)

**orgs** - Core organization table
- File: `packages/module-access/db/schema/002-orgs.sql`
- Missing columns: is_deleted, deleted_at, deleted_by
- Incorrect columns: created_by (needs NOT NULL + FK), updated_by (needs FK)
- Missing index: idx_orgs_is_deleted
- Missing trigger: orgs_sync_is_deleted

**org_members** - Organization membership
- File: `packages/module-access/db/schema/004-org-members.sql`
- Missing columns: created_by, updated_by, is_deleted, deleted_at, deleted_by
- Incorrect columns: created_at (needs NOT NULL), updated_at (needs NOT NULL)
- Missing index: idx_org_members_is_deleted
- Missing trigger: org_members_sync_is_deleted

**user_sessions** - User session tracking
- File: `packages/module-access/db/schema/007-auth-events-sessions.sql`
- Missing ALL audit columns: created_at, created_by, updated_at, updated_by
- Missing soft delete: is_deleted, deleted_at, deleted_by
- Missing index: idx_user_sessions_is_deleted
- Missing trigger: user_sessions_sync_is_deleted

#### 2. module-ws Tables (2 tables)

**workspaces** - Workspace entity
- File: `packages/module-ws/db/schema/001-workspace.sql`
- Missing columns: is_deleted
- Missing index: idx_workspaces_is_deleted
- Missing trigger: workspaces_sync_is_deleted

**ws_members** - Workspace membership
- File: `packages/module-ws/db/schema/002-ws-member.sql`
- Missing columns: is_deleted, deleted_by
- Missing indexes: idx_ws_members_is_deleted, idx_ws_members_ws_not_deleted
- Missing trigger: ws_members_sync_is_deleted

#### 3. module-kb Tables (2 tables)

**kb_bases** - Knowledge base container
- File: `packages/module-kb/db/schema/001-kb-bases.sql`
- Missing indexes: idx_kb_bases_is_deleted, idx_kb_bases_ws_not_deleted
- Missing trigger: kb_bases_sync_is_deleted

**kb_docs** - Knowledge base documents
- File: `packages/module-kb/db/schema/002-kb-docs.sql`
- Missing columns: updated_by
- Missing index: idx_kb_docs_is_deleted
- Missing trigger: kb_docs_sync_is_deleted

#### 4. module-chat Tables (1 table)

**chat_sessions** - Chat session container
- File: `packages/module-chat/db/schema/001-chat-sessions.sql`
- Missing index: idx_chat_sessions_ws_not_deleted
- Missing trigger: chat_sessions_sync_is_deleted
- Note: Already has idx_chat_sessions_is_deleted but needs composite ws+not_deleted index

### OUT OF SCOPE

- Database naming violations (5 errors) - Deferred to API Standards sprint
- Other validators not related to audit columns

---

## Implementation Steps

### Phase 1: module-access Tables (Highest Priority) - Est. 60-90 min

#### Step 1.1: Fix orgs Table

**File:** `templates/_modules-core/module-access/db/schema/002-orgs.sql`

**Actions:**
- [ ] Add missing columns:
  ```sql
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
  ```
- [ ] Fix created_by: Add `NOT NULL` and ensure `REFERENCES auth.users(id)`
- [ ] Fix updated_by: Add `REFERENCES auth.users(id)`
- [ ] Add index:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_orgs_is_deleted ON public.orgs(is_deleted) WHERE is_deleted = false;
  ```
- [ ] Add trigger:
  ```sql
  CREATE TRIGGER orgs_sync_is_deleted BEFORE UPDATE ON public.orgs
      FOR EACH ROW
      WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
      EXECUTE FUNCTION sync_is_deleted();
  ```

#### Step 1.2: Fix org_members Table

**File:** `templates/_modules-core/module-access/db/schema/004-org-members.sql`

**Actions:**
- [ ] Add missing columns: created_by, updated_by, is_deleted, deleted_at, deleted_by
- [ ] Fix created_at: Add `NOT NULL`
- [ ] Fix updated_at: Add `NOT NULL`
- [ ] Add index: idx_org_members_is_deleted
- [ ] Add trigger: org_members_sync_is_deleted

#### Step 1.3: Fix user_sessions Table

**File:** `templates/_modules-core/module-access/db/schema/007-auth-events-sessions.sql`

**Actions:**
- [ ] Add ALL missing audit columns
- [ ] Add soft delete columns
- [ ] Add index: idx_user_sessions_is_deleted
- [ ] Add trigger: user_sessions_sync_is_deleted

---

### Phase 2: module-ws Tables - Est. 45-60 min

#### Step 2.1: Fix workspaces Table

**File:** `templates/_modules-core/module-ws/db/schema/001-workspace.sql`

**Actions:**
- [ ] Add is_deleted column
- [ ] Add index: idx_workspaces_is_deleted
- [ ] Add trigger: workspaces_sync_is_deleted

#### Step 2.2: Fix ws_members Table

**File:** `templates/_modules-core/module-ws/db/schema/002-ws-member.sql`

**Actions:**
- [ ] Add is_deleted, deleted_by columns
- [ ] Add indexes: idx_ws_members_is_deleted, idx_ws_members_ws_not_deleted
- [ ] Add trigger: ws_members_sync_is_deleted

---

### Phase 3: module-kb Tables - Est. 30-45 min

#### Step 3.1: Fix kb_bases Table

**File:** `templates/_modules-core/module-kb/db/schema/001-kb-bases.sql`

**Actions:**
- [ ] Add indexes: idx_kb_bases_is_deleted, idx_kb_bases_ws_not_deleted
- [ ] Add trigger: kb_bases_sync_is_deleted

#### Step 3.2: Fix kb_docs Table

**File:** `templates/_modules-core/module-kb/db/schema/002-kb-docs.sql`

**Actions:**
- [ ] Add updated_by column
- [ ] Add index: idx_kb_docs_is_deleted
- [ ] Add trigger: kb_docs_sync_is_deleted

---

### Phase 4: module-chat Tables - Est. 15-20 min

#### Step 4.1: Fix chat_sessions Table

**File:** `templates/_modules-core/module-chat/db/schema/001-chat-sessions.sql`

**Actions:**
- [ ] Add composite index:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_chat_sessions_ws_not_deleted ON public.chat_sessions(ws_id) WHERE is_deleted = false;
  ```
- [ ] Add trigger: chat_sessions_sync_is_deleted

---

### Phase 5: Template Updates & Testing

- [ ] All fixes applied to templates (template-first workflow)
- [ ] Create shared trigger function if not exists
- [ ] Sync fixes to test project
- [ ] Run validation suite
- [ ] Verify Audit Column validator passes

---

### Phase 6: Verification & Documentation

- [ ] Confirm 0 non-compliant tables (100% compliance)
- [ ] Update context file with Sprint S5 completion
- [ ] All fixes committed to branch fix/audit-columns-s5
- [ ] Ready for merge

---

## Success Criteria

- [ ] Audit Column Validator shows 0 non-compliant tables
- [ ] Compliance Rate: 100% (8/8 tables compliant)
- [ ] All entity tables have:
  - [ ] Standard audit columns (created_at, updated_at, created_by, updated_by)
  - [ ] Soft delete support (is_deleted, deleted_at, deleted_by)
  - [ ] Proper indexes for soft delete queries
  - [ ] Triggers for syncing is_deleted flag
- [ ] No regressions introduced (other validator counts unchanged)
- [ ] Fixes applied to templates first, then synced to test project
- [ ] Changes documented in context file

---

## Technical Approach

### 1. Standard Audit Columns Pattern

```sql
-- Always include these columns on entity tables
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by UUID NOT NULL REFERENCES auth.users(id),
updated_by UUID REFERENCES auth.users(id)
```

### 2. Soft Delete Pattern

```sql
-- Soft delete columns
is_deleted BOOLEAN NOT NULL DEFAULT false,
deleted_at TIMESTAMPTZ,
deleted_by UUID REFERENCES auth.users(id)

-- Soft delete index
CREATE INDEX IF NOT EXISTS idx_{table}_is_deleted ON public.{table}(is_deleted) WHERE is_deleted = false;

-- Composite index for workspace-scoped queries
CREATE INDEX IF NOT EXISTS idx_{table}_ws_not_deleted ON public.{table}(ws_id) WHERE is_deleted = false;
```

### 3. Trigger Pattern

```sql
-- Shared trigger function (create once, use for all tables)
CREATE OR REPLACE FUNCTION sync_is_deleted()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        NEW.is_deleted = true;
    ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
        NEW.is_deleted = false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to each table
CREATE TRIGGER {table}_sync_is_deleted BEFORE UPDATE ON public.{table}
    FOR EACH ROW
    WHEN (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at)
    EXECUTE FUNCTION sync_is_deleted();
```

**Reference:** ADR-015 - Module Entity Audit Columns

---

## Template-First Workflow

All fixes follow this process:

1. **Fix in Template** - Update schema file in `templates/_modules-core/{module}/db/schema/`
2. **Sync to Test Project** - Use `scripts/sync-fix-to-project.sh`
3. **Verify** - Run Audit Column validator
4. **Iterate** - Repeat until table is compliant

---

## Validation Commands

**Full validation:**
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
python3 validation/cora-validate.py project ~/code/bodhix/testing/test-access/ai-sec-stack --format text
```

**Audit Column validator only:**
```bash
python3 validation/audit-column-validator/cli.py ~/code/bodhix/testing/test-access/ai-sec-stack
```

---

## Dependencies

**Completed Prerequisites:**
- ✅ Sprint S1 - TypeScript errors eliminated
- ✅ Sprint S2 - API Tracer compliance
- ✅ Sprint S3 - Accessibility compliance
- ✅ Sprint S4 (partial) - Next.js Routing + Admin Auth

**Blocking Issues:** None

---

## Notes

**Sprint Rationale:**
- Separated from S4 due to scope underestimation (8 tables vs 1 error)
- Requires systematic approach across multiple modules
- Estimated 3-4 hours of focused work
- High impact on data integrity and consistency

**Deferred from S4:**
- Original plan estimated "1 error" but validator found 8 non-compliant tables
- Requires comprehensive schema updates across 4 modules
- Deserves dedicated sprint for proper implementation

**Post-Sprint:**
- After S5 completion, continue with remaining S4 scope:
  - Workspace Plugin (2 errors)
  - TypeScript (9 errors)

---

**Created:** January 27, 2026  
**Last Updated:** January 27, 2026  
**Status:** 🟡 PLANNED - Sprint S5 scheduled after S4 completion