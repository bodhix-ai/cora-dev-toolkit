# Audit Column Compliance Plan

**Status**: 🟡 PLANNED  
**Priority**: 🔴 High  
**Created**: January 22, 2026  
**Owner**: Engineering Team  
**Related**: ADR-015-MODULE-ENTITY-AUDIT-COLUMNS.md

---

## Executive Summary

Following the implementation of ADR-015 (Audit Column Compliance), we ran the audit-column-validator and discovered **8 non-compliant tables** across core modules. This plan outlines the systematic approach to bring all entity tables into compliance with the audit column standard.

**Current Compliance: 11.1% (1/9 tables compliant)**
**Target Compliance: 100% (9/9 tables compliant)**

---

## Compliance Report

### ✅ Compliant Tables (1)

- `voice_sessions` (module-voice) - 100% compliant

### ❌ Non-Compliant Tables (8)

| Module | Table | Missing Columns | Missing Indexes | Missing Triggers |
|--------|-------|-----------------|-----------------|------------------|
| module-chat | chat_sessions | 0 | 2 | 1 |
| module-ws | ws_members | 2 | 2 | 1 |
| module-ws | workspaces | 1 | 1 | 1 |
| module-access | orgs | 3 + 2 incorrect | 1 | 1 |
| module-access | user_sessions | 7 | 1 | 1 |
| module-access | org_members | 5 + 2 incorrect | 1 | 1 |
| module-kb | kb_bases | 0 | 2 | 1 |
| module-kb | kb_docs | 1 | 1 | 1 |

---

## Detailed Findings

### 1. chat_sessions (module-chat)

**File**: `templates/_modules-core/module-chat/db/schema/001-chat-sessions.sql`

**Missing:**
- **Indexes:**
  - `idx_chat_sessions_is_deleted`
  - `idx_chat_sessions_ws_not_deleted`
- **Trigger:** `chat_sessions_sync_is_deleted`

**Status:** Columns present, only indexes/triggers missing

---

### 2. ws_members (module-ws)

**File**: `templates/_modules-core/module-ws/db/schema/002-ws-member.sql`

**Missing:**
- **Columns:**
  - `is_deleted` (BOOLEAN)
  - `deleted_by` (UUID)
- **Indexes:**
  - `idx_ws_members_is_deleted`
  - `idx_ws_members_ws_not_deleted`
- **Trigger:** `ws_members_sync_is_deleted`

**Status:** Requires schema changes + indexes/triggers

---

### 3. workspaces (module-ws)

**File**: `templates/_modules-core/module-ws/db/schema/001-workspace.sql`

**Missing:**
- **Columns:**
  - `is_deleted` (BOOLEAN)
- **Indexes:**
  - `idx_workspaces_is_deleted`
- **Trigger:** `workspaces_sync_is_deleted`

**Status:** Requires schema changes + indexes/triggers

---

### 4. orgs (module-access)

**File**: `templates/_modules-core/module-access/db/schema/002-orgs.sql`

**Missing Columns:**
- `is_deleted` (BOOLEAN)
- `deleted_at` (TIMESTAMPTZ)
- `deleted_by` (UUID)

**Incorrect Columns:**
- `created_by` - should be NOT NULL, reference auth.users(id)
- `updated_by` - should reference auth.users(id)

**Missing Indexes:**
- `idx_orgs_is_deleted`

**Missing Trigger:**
- `orgs_sync_is_deleted`

**Status:** Requires schema changes + column fixes + indexes/triggers

---

### 5. user_sessions (module-access)

**File**: `templates/_modules-core/module-access/db/schema/007-auth-events-sessions.sql`

**Missing ALL Audit Columns:**
- `created_at` (TIMESTAMPTZ)
- `created_by` (UUID)
- `updated_at` (TIMESTAMPTZ)
- `updated_by` (UUID)
- `is_deleted` (BOOLEAN)
- `deleted_at` (TIMESTAMPTZ)
- `deleted_by` (UUID)

**Missing Indexes:**
- `idx_user_sessions_is_deleted`

**Missing Trigger:**
- `user_sessions_sync_is_deleted`

**Status:** Complete audit column set missing - major refactor needed

**Note:** This may be intentional if user_sessions is a system/event table, not an entity table. Needs review.

---

### 6. org_members (module-access)

**File**: `templates/_modules-core/module-access/db/schema/004-org-members.sql`

**Missing Columns:**
- `created_by` (UUID)
- `updated_by` (UUID)
- `is_deleted` (BOOLEAN)
- `deleted_at` (TIMESTAMPTZ)
- `deleted_by` (UUID)

**Incorrect Columns:**
- `created_at` - should be NOT NULL
- `updated_at` - should be NOT NULL

**Missing Indexes:**
- `idx_org_members_is_deleted`

**Missing Trigger:**
- `org_members_sync_is_deleted`

**Status:** Requires schema changes + column fixes + indexes/triggers

---

### 7. kb_bases (module-kb)

**File**: `templates/_modules-core/module-kb/db/schema/001-kb-bases.sql`

**Missing:**
- **Indexes:**
  - `idx_kb_bases_is_deleted`
  - `idx_kb_bases_ws_not_deleted`
- **Trigger:** `kb_bases_sync_is_deleted`

**Status:** Columns present, only indexes/triggers missing

---

### 8. kb_docs (module-kb)

**File**: `templates/_modules-core/module-kb/db/schema/002-kb-docs.sql`

**Missing:**
- **Columns:**
  - `updated_by` (UUID)
- **Indexes:**
  - `idx_kb_docs_is_deleted`
- **Trigger:** `kb_docs_sync_is_deleted`

**Status:** Minor column addition + indexes/triggers

---

## Implementation Strategy

### Phase 1: Module-Scoped Implementation

Group by module to minimize context switching and enable module-level testing.

**Order of Implementation:**
1. **module-kb** (2 tables, minor changes)
2. **module-chat** (1 table, indexes/triggers only)
3. **module-ws** (2 tables, moderate changes)
4. **module-access** (3 tables, complex changes)

### Phase 2: Per-Table Implementation

For each table:

1. **Update Schema File**
   - Add missing columns with defaults
   - Fix incorrect columns (nullable, references)
   - Add missing indexes
   - Add missing trigger

2. **Create Migration**
   - Idempotent migration script
   - Safe defaults for new columns
   - Index creation
   - Trigger creation

3. **Update RLS Policies** (if needed)
   - Ensure policies respect `is_deleted`
   - Add policies for new columns

4. **Test**
   - Apply migration to test database
   - Verify indexes created
   - Verify trigger works
   - Run full validation suite

---

## Migration Strategy

### Safe Defaults for New Columns

```sql
-- is_deleted (BOOLEAN)
ALTER TABLE {table_name} 
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- deleted_at (TIMESTAMPTZ)
ALTER TABLE {table_name} 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- deleted_by (UUID)
ALTER TABLE {table_name} 
  ADD COLUMN IF NOT EXISTS deleted_by UUID 
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- created_by (UUID) - if missing
ALTER TABLE {table_name} 
  ADD COLUMN IF NOT EXISTS created_by UUID 
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- updated_by (UUID) - if missing
ALTER TABLE {table_name} 
  ADD COLUMN IF NOT EXISTS updated_by UUID 
  REFERENCES auth.users(id) ON DELETE SET NULL;
```

### Index Pattern

```sql
-- is_deleted index
CREATE INDEX IF NOT EXISTS idx_{table_name}_is_deleted 
  ON {table_name}(is_deleted);

-- workspace + not deleted index (for workspace-scoped tables)
CREATE INDEX IF NOT EXISTS idx_{table_name}_ws_not_deleted 
  ON {table_name}(ws_id) 
  WHERE is_deleted = false;
```

### Trigger Pattern

```sql
-- Sync trigger for is_deleted
CREATE TRIGGER {table_name}_sync_is_deleted
  BEFORE UPDATE OF is_deleted ON {table_name}
  FOR EACH ROW
  WHEN (NEW.is_deleted = true AND OLD.is_deleted = false)
  EXECUTE FUNCTION sync_is_deleted();
```

---

## Special Considerations

### user_sessions Table

**Question:** Is `user_sessions` an entity table or a system/event table?

**If Entity Table:**
- Apply full audit column standard
- Add all 7 missing columns
- Add indexes and trigger

**If System/Event Table:**
- May not need full audit columns
- Consider marking as exception in ADR-015
- Document rationale

**Recommendation:** Review with team before implementing.

---

### Backward Compatibility

**Existing Data:**
- All new columns have safe defaults
- No data loss
- Existing queries continue to work

**Application Code:**
- RLS policies updated to filter `is_deleted = false`
- Lambda queries updated to check `is_deleted`
- Frontend displays may need updates

**Migrations:**
- All migrations are idempotent
- Safe to run multiple times
- Safe to run on production

---

## Testing Strategy

### Per-Table Tests

1. **Migration Application**
   - Apply migration to test database
   - Verify all columns exist
   - Verify all indexes exist
   - Verify trigger exists

2. **Functional Tests**
   - Insert new row (verify defaults)
   - Update row (verify trigger)
   - Soft delete row (verify is_deleted = true)
   - Query filtered by is_deleted

3. **Validation**
   - Run audit-column-validator
   - Verify table is compliant
   - No errors or warnings

### Full Suite Tests

After all tables updated:

1. Run full validation suite
2. Verify 100% compliance
3. Document any exceptions
4. Update ADR-015 if needed

---

## File Organization

### Migrations Location

```
templates/_modules-core/{module}/db/migrations/
  20260123_add_audit_columns_{table_name}.sql
  20260123_add_audit_indexes_{table_name}.sql
  20260123_add_audit_trigger_{table_name}.sql
```

### Schema Files

```
templates/_modules-core/{module}/db/schema/
  {number}-{table_name}.sql (updated in place)
```

---

## Implementation Checklist

### Module-KB (Easy - Start Here)

- [ ] **kb_docs**
  - [ ] Add `updated_by` column to schema
  - [ ] Add `idx_kb_docs_is_deleted` index
  - [ ] Add `kb_docs_sync_is_deleted` trigger
  - [ ] Create migration
  - [ ] Test and validate

- [ ] **kb_bases**
  - [ ] Add `idx_kb_bases_is_deleted` index
  - [ ] Add `idx_kb_bases_ws_not_deleted` index
  - [ ] Add `kb_bases_sync_is_deleted` trigger
  - [ ] Create migration
  - [ ] Test and validate

### Module-Chat (Easy)

- [ ] **chat_sessions**
  - [ ] Add `idx_chat_sessions_is_deleted` index
  - [ ] Add `idx_chat_sessions_ws_not_deleted` index
  - [ ] Add `chat_sessions_sync_is_deleted` trigger
  - [ ] Create migration
  - [ ] Test and validate

### Module-WS (Moderate)

- [ ] **workspaces**
  - [ ] Add `is_deleted` column to schema
  - [ ] Add `idx_workspaces_is_deleted` index
  - [ ] Add `workspaces_sync_is_deleted` trigger
  - [ ] Update RLS policies (filter by is_deleted)
  - [ ] Create migration
  - [ ] Test and validate

- [ ] **ws_members**
  - [ ] Add `is_deleted` column to schema
  - [ ] Add `deleted_by` column to schema
  - [ ] Add `idx_ws_members_is_deleted` index
  - [ ] Add `idx_ws_members_ws_not_deleted` index
  - [ ] Add `ws_members_sync_is_deleted` trigger
  - [ ] Update RLS policies (filter by is_deleted)
  - [ ] Create migration
  - [ ] Test and validate

### Module-Access (Complex)

- [ ] **Review user_sessions** (FIRST)
  - [ ] Determine if entity or system table
  - [ ] Document decision in ADR-015
  - [ ] If entity: add all 7 audit columns
  - [ ] If system: mark as exception

- [ ] **orgs**
  - [ ] Add `is_deleted` column to schema
  - [ ] Add `deleted_at` column to schema
  - [ ] Add `deleted_by` column to schema
  - [ ] Fix `created_by` (NOT NULL, reference)
  - [ ] Fix `updated_by` (reference)
  - [ ] Add `idx_orgs_is_deleted` index
  - [ ] Add `orgs_sync_is_deleted` trigger
  - [ ] Update RLS policies (filter by is_deleted)
  - [ ] Create migration
  - [ ] Test and validate

- [ ] **org_members**
  - [ ] Add `created_by` column to schema
  - [ ] Add `updated_by` column to schema
  - [ ] Add `is_deleted` column to schema
  - [ ] Add `deleted_at` column to schema
  - [ ] Add `deleted_by` column to schema
  - [ ] Fix `created_at` (NOT NULL)
  - [ ] Fix `updated_at` (NOT NULL)
  - [ ] Add `idx_org_members_is_deleted` index
  - [ ] Add `org_members_sync_is_deleted` trigger
  - [ ] Update RLS policies (filter by is_deleted)
  - [ ] Create migration
  - [ ] Test and validate

### Final Validation

- [ ] Run audit-column-validator on all modules
- [ ] Verify 100% compliance (or documented exceptions)
- [ ] Update ADR-015 with any exceptions
- [ ] Document any special cases
- [ ] Update memory-bank with completion

---

## Success Criteria

- [x] All entity tables have required audit columns
- [x] All tables have required indexes
- [x] All tables have required triggers
- [x] RLS policies respect `is_deleted` flag
- [x] Migrations are idempotent and safe
- [x] Audit-column-validator shows 100% compliance
- [x] No breaking changes to application code

---

## Estimated Timeline

| Module | Tables | Effort | Duration |
|--------|--------|--------|----------|
| **module-kb** | 2 | Easy | 2-3 hours |
| **module-chat** | 1 | Easy | 1-2 hours |
| **module-ws** | 2 | Moderate | 3-4 hours |
| **module-access** | 3 | Complex | 6-8 hours |
| **Testing & Validation** | All | - | 2-3 hours |
| **Total** | **8 tables** | - | **14-20 hours** |

**Recommended Approach:** Tackle one module per session for focused work.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing queries | Low | High | Test thoroughly, RLS policies first |
| Migration failures | Low | Medium | Idempotent migrations, safe defaults |
| Performance impact (indexes) | Low | Low | Monitor query performance |
| Data inconsistency | Low | Medium | Use transactions, verify data |

---

## Next Steps

1. **Review user_sessions classification** (entity vs system table)
2. **Start with module-kb** (easiest, builds confidence)
3. **Create migration template** (reusable across tables)
4. **Test on ai-sec project** (verify migrations work)
5. **Document any exceptions** (update ADR-015)

---

**Document Status:** 🟡 PLANNED  
**Priority:** 🔴 High  
**Blocking:** Template compliance, production deployments  
**Next Action:** Review user_sessions classification, then start module-kb implementation  
**Related ADR:** ADR-015-MODULE-ENTITY-AUDIT-COLUMNS.md  
**Last Updated:** January 22, 2026
