# Migration Plan: Database Naming Standards Compliance

**Status:** Draft  
**Created:** January 14, 2026  
**Priority:** Pre-requisite for kb, chat, wf module development  
**Related:** [ADR-011](../arch%20decisions/ADR-011-CONFIG-TABLE-NAMING.md), [DATABASE-NAMING](../standards/cora/standard_DATABASE-NAMING.md)

---

## Executive Summary

This plan migrates 13 tables to comply with the updated DATABASE-NAMING standards (Rule 8 - Specialized Table Patterns). Tables are grouped by Lambda dependency to minimize code changes and risk.

**Key Principle:** Touch each Lambda only once during migration.

---

## Validator Whitelist (Temporary - January 17, 2026)

The following tables/indexes are **whitelisted in the Database Naming validator** (`scripts/validate-db-naming.py`) until their migration phases complete. This allows new modules to pass validation while deferring legacy module migrations.

### Legacy Module Errors (9 items - Whitelisted)

**Phase 1: Critical Auth Tables (module-access)**
- `sys_idp_config` → Will be migrated to `sys_cfg_idp`
- `sys_idp_audit_log` → Will be migrated to `sys_log_idp_audit`

**Phase 2: System Config Tables (module-mgmt)**
- `sys_lambda_config` → Will be migrated to `sys_cfg_lambda`

**Phase 5: Log/History Tables (Deferred)**
- `user_auth_log` → Will be migrated to `user_log_auth`
- `ai_model_validation_history` → Will be migrated to `ai_hist_model_validation`
- `ai_model_validation_progress` → Will be migrated to `ai_state_validation`

**Not Yet Scheduled (Needs Phase Assignment)**
- `sys_module_registry` → Needs pluralization (not yet in plan)
- `sys_module_usage` → Needs pluralization (Phase 6 - deferred)

**Index Naming (module-ai)**
- `ai_cfg_sys_rag_singleton` → Should be `idx_ai_cfg_sys_rag_singleton`

### New Module Fixes (2 items - Fixed in Templates)

**module-kb (Session 151 - January 17, 2026):**
- ✅ `chat_session_kb` → `chat_session_kbs` - **FIXED in templates**
  - Updated: `templates/_modules-core/module-kb/db/schema/010-chat-session-kb.sql`
  - Updated: `templates/_modules-core/module-kb/db/schema/011-chat-rls-kb.sql`
  - **Cleanup Required**: Before next test-module run, execute: `DROP TABLE IF EXISTS public.chat_session_kb CASCADE;`

**module-ws (Not Yet Templated):**
- `ws_activity_log` → `ws_activity_logs` - **Pending templating**
  - Module-ws exists only in test projects (not templated yet)
  - Fix will be applied when module-ws is templated

### Whitelist Removal Process

As each migration phase completes, remove the corresponding tables/indexes from `LEGACY_WHITELIST` in `scripts/validate-db-naming.py`.

---

## Migration Phases

### Phase 0: Standards Foundation ✅ COMPLETE

**Duration:** 4.5 hours  
**Status:** Complete

| Task | Status |
|------|--------|
| Update ADR-011 with all infix patterns | ✅ Complete |
| Update DATABASE-NAMING standard Rule 8 | ✅ Complete |
| Fix validator Python 3.9 compatibility | ✅ Complete |
| Add log/hist/usage/state/queue detection | ✅ Complete |
| Test validator against all modules | ⏳ Pending |

---

### Phase 1: Critical Auth Tables (sys_cfg_idp)

**Risk Level:** ❌ CRITICAL - Auth system dependency  
**Duration:** 3-4 hours  
**Lambda Impact:** `module-access/idp-config` only

#### Tables to Migrate

| Current Name | New Name | Type | Rows |
|--------------|----------|------|------|
| `sys_idp_config` | `sys_cfg_idp` | Config | Singleton |
| `sys_idp_audit_log` | `sys_log_idp_audit` | Log | Multi-row |

#### Migration Steps

```sql
-- 1. Create new tables with correct naming
CREATE TABLE sys_cfg_idp (
    -- Copy structure from sys_idp_config
    ...
);

CREATE TABLE sys_log_idp_audit (
    -- Copy structure from sys_idp_audit_log
    ...
);

-- 2. Copy data
INSERT INTO sys_cfg_idp SELECT * FROM sys_idp_config;
INSERT INTO sys_log_idp_audit SELECT * FROM sys_idp_audit_log;

-- 3. Update foreign keys
ALTER TABLE sys_log_idp_audit
    DROP CONSTRAINT sys_idp_audit_log_idp_config_id_fkey,
    ADD CONSTRAINT sys_log_idp_audit_idp_config_id_fkey
        FOREIGN KEY (idp_config_id) REFERENCES sys_cfg_idp(id);

-- 4. Recreate indexes
DROP INDEX idx_sys_idp_audit_config;
CREATE INDEX idx_sys_log_idp_audit_config ON sys_log_idp_audit(idp_config_id);

-- 5. Update RLS policies (both tables)
-- ... (copy policy structure)

-- 6. Create backward-compatible views (temporary)
CREATE VIEW sys_idp_config AS SELECT * FROM sys_cfg_idp;
CREATE VIEW sys_idp_audit_log AS SELECT * FROM sys_log_idp_audit;
```

#### Code Changes

**Lambda:** `module-access/backend/lambdas/idp-config/lambda_function.py`
- Update all SQL queries: `sys_idp_config` → `sys_cfg_idp`
- Update all SQL queries: `sys_idp_audit_log` → `sys_log_idp_audit`

**Template:** `module-access/db/schema/005-sys-idp-config.sql`
- Rename file to `005-sys-cfg-idp.sql`
- Update table creation statements

#### Testing

- [ ] Test IDP configuration read/write
- [ ] Test IDP audit logging
- [ ] Test auth flow end-to-end
- [ ] Verify RLS policies work correctly

#### Post-Migration

- [ ] **Remove from whitelist**: Delete `sys_idp_config` and `sys_idp_audit_log` from `LEGACY_WHITELIST` in `scripts/validate-db-naming.py`
- [ ] Verify validator passes with whitelist entries removed

#### Rollback Plan

1. Drop new tables
2. Remove foreign key updates
3. Revert Lambda code
4. Views ensure old code continues to work

---

### Phase 2: System Config Tables (sys_cfg_lambda)

**Risk Level:** ⚠️ HIGH - Admin functionality  
**Duration:** 2-3 hours  
**Lambda Impact:** `module-mgmt/lambda-mgmt` only

#### Tables to Migrate

| Current Name | New Name | Type | Rows |
|--------------|----------|------|------|
| `sys_lambda_config` | `sys_cfg_lambda` | Config | Multi-row |

#### Migration Steps

```sql
-- 1. Create new table
CREATE TABLE sys_cfg_lambda (
    -- Copy structure from sys_lambda_config
    ...
);

-- 2. Copy data
INSERT INTO sys_cfg_lambda SELECT * FROM sys_lambda_config;

-- 3. Recreate indexes
DROP INDEX idx_sys_lambda_config_key;
CREATE INDEX idx_sys_cfg_lambda_key ON sys_cfg_lambda(config_key);

-- 4. Update RLS policies
-- ... (copy policy structure)

-- 5. Create backward-compatible view
CREATE VIEW sys_lambda_config AS SELECT * FROM sys_cfg_lambda;
```

#### Code Changes

**Lambda:** `module-mgmt/backend/lambdas/lambda-mgmt/lambda_function.py`
- Update all SQL queries: `sys_lambda_config` → `sys_cfg_lambda`

**Template:** `module-mgmt/db/schema/001-sys-lambda-config.sql`
- Rename file to `001-sys-cfg-lambda.sql`
- Update table creation statements

**Frontend:** `module-mgmt/frontend/components/admin/LambdaWarmingTab.tsx`
- No changes needed (uses API)

#### Testing

- [ ] Test Lambda warming toggle
- [ ] Test custom schedule configuration
- [ ] Test admin dashboard displays correctly

#### Post-Migration

- [ ] **Remove from whitelist**: Delete `sys_lambda_config` from `LEGACY_WHITELIST` in `scripts/validate-db-naming.py`
- [ ] Verify validator passes with whitelist entry removed

---

### Phase 3: Workspace Config Tables (Combined)

**Risk Level:** ⚠️ HIGH - Core module functionality  
**Duration:** 4-5 hours  
**Lambda Impact:** `module-ws/workspace` only (both config + log)

#### Tables to Migrate

| Current Name | New Name | Type | Rows |
|--------------|----------|------|------|
| `ws_configs` | `ws_cfg_sys` | Config | Singleton |
| `ws_org_settings` | `ws_cfg_org` | Config | Multi-row |
| `ws_activity_log` | `ws_log_activity` | Log | Multi-row |

**Note:** All three tables handled by same Lambda - migrate together to avoid touching Lambda twice.

#### Migration Steps

```sql
-- 1. Create new tables
CREATE TABLE ws_cfg_sys (
    -- Copy structure from ws_configs
    ...
);

CREATE TABLE ws_cfg_org (
    -- Copy structure from ws_org_settings
    ...
);

CREATE TABLE ws_log_activity (
    -- Copy structure from ws_activity_log
    ...
);

-- 2. Copy data
INSERT INTO ws_cfg_sys SELECT * FROM ws_configs;
INSERT INTO ws_cfg_org SELECT * FROM ws_org_settings;
INSERT INTO ws_log_activity SELECT * FROM ws_activity_log;

-- 3. Update foreign keys
ALTER TABLE ws_log_activity
    DROP CONSTRAINT ws_activity_log_ws_id_fkey,
    ADD CONSTRAINT ws_log_activity_ws_id_fkey
        FOREIGN KEY (ws_id) REFERENCES workspaces(id);

-- 4. Recreate indexes
-- ... (update all index names)

-- 5. Update RLS policies
-- ... (copy policy structure for all three tables)

-- 6. Create backward-compatible views
CREATE VIEW ws_configs AS SELECT * FROM ws_cfg_sys;
CREATE VIEW ws_org_settings AS SELECT * FROM ws_cfg_org;
CREATE VIEW ws_activity_log AS SELECT * FROM ws_log_activity;
```

#### Code Changes

**Lambda:** `module-ws/backend/lambdas/workspace/lambda_function.py`
- Update all SQL queries: `ws_configs` → `ws_cfg_sys`
- Update all SQL queries: `ws_org_settings` → `ws_cfg_org`
- Update all SQL queries: `ws_activity_log` → `ws_log_activity`

**Templates:**
- `module-ws/db/schema/003-ws-config.sql` → `003-ws-cfg-sys.sql`
- `module-ws/db/schema/005-ws-org-settings.sql` → `005-ws-cfg-org.sql`
- `module-ws/db/schema/006-ws-activity-log.sql` → `006-ws-log-activity.sql`

**Frontend:** `module-ws/frontend/lib/api.ts`
- No changes needed (uses API)

#### Testing

- [ ] Test workspace settings save/load
- [ ] Test org-level overrides
- [ ] Test activity logging
- [ ] Test workspace admin page

#### Post-Migration

- [ ] **Note**: `ws_activity_log` not in whitelist (module-ws not yet templated)
- [ ] When module-ws is templated, ensure it uses `ws_activity_logs` (plural)

---

### Phase 4: AI Config Tables ✅ HANDLED BY MODULE-KB PHASE 0

**Risk Level:** ⚠️ MEDIUM - AI functionality  
**Duration:** N/A (handled by module-kb implementation)  
**Lambda Impact:** `module-ai/ai-config-handler` only

**Note:** This entire phase is being handled as **Phase 0** of the module-kb implementation plan. Both tables are migrated together since they're used by the same Lambda. See [plan_module-kb-implementation.md](plan_module-kb-implementation.md#phase-0-prerequisite---ai-config-table-migration-session-103) for details.

#### Tables to Migrate

| Current Name | New Name | Type | Rows | Status |
|--------------|----------|------|------|--------|
| `org_prompt_engineering` | `ai_cfg_org_prompts` | Config | Multi-row | ✅ **Handled by module-kb Phase 0** |
| `sys_rag` | `ai_cfg_sys_rag` | Config | Singleton | ✅ **Handled by module-kb Phase 0** |

#### Migration Steps

**See:** [module-kb Phase 0](plan_module-kb-implementation.md#phase-0-prerequisite---ai-config-table-migration-session-103) - both tables migrated together as prerequisite to module-kb implementation.

**Rationale:** Since both tables are used by the same Lambda (`ai-config-handler`), migrating them together follows the "touch each Lambda only once" principle. By doing this migration as part of module-kb Phase 0, we ensure:
1. Module-kb code references correctly-named tables from day one
2. No future migration needed for module-kb
3. Single Lambda update for both tables (efficiency)

#### Code Changes

**See module-kb Phase 0** - all code changes documented there.

#### Testing

**See module-kb Phase 0** - testing checklist included in that phase.

---

### Phase 5: Log/History Tables (Low Priority - Deferred)

**Risk Level:** ✅ LOW - Analytics/audit only  
**Duration:** 2-3 hours  
**Lambda Impact:** Minimal - mostly read operations

#### Tables to Migrate

| Current Name | New Name | Type | Priority |
|--------------|----------|------|----------|
| `user_auth_log` | `user_log_auth` | Log | P3 (Low) |
| `ai_model_validation_history` | `ai_hist_model_validation` | History | P3 (Low) |
| `ai_model_validation_progress` | `ai_state_validation` | State | P3 (Low) |

**Decision:** Defer to after kb/chat/wf modules complete. These tables are read-only for analytics and don't block new module development.

#### Post-Migration (When Phase 5 Executes)

- [ ] **Remove from whitelist**: Delete `user_auth_log`, `ai_model_validation_history`, and `ai_model_validation_progress` from `LEGACY_WHITELIST` in `scripts/validate-db-naming.py`
- [ ] Verify validator passes with whitelist entries removed

---

### Phase 6: Usage Tracking Tables (Low Priority - Deferred)

**Risk Level:** ✅ LOW - Analytics only  
**Duration:** 1-2 hours  
**Lambda Impact:** None in templates (future feature)

#### Tables to Migrate

| Current Name | New Name | Type | Priority |
|--------------|----------|------|----------|
| `sys_module_usage` | `sys_usage_module` | Usage | P3 (Low) |
| `sys_module_usage_daily` | `sys_usage_module_daily` | Usage | P3 (Low) |

**Decision:** Defer indefinitely. No code currently uses these tables.

#### Post-Migration (When Phase 6 Executes)

- [ ] **Remove from whitelist**: Delete `sys_module_usage` from `LEGACY_WHITELIST` in `scripts/validate-db-naming.py`
- [ ] **Add to plan**: `sys_module_registry` migration (not yet scheduled)
- [ ] **Note**: `ai_cfg_sys_rag_singleton` index needs idx_ prefix (not yet scheduled)

---

## Implementation Strategy

### Option A: Phased Implementation (Recommended)

Execute phases 1-4 sequentially before kb/chat/wf module development.

**Timeline:**
- Phase 1 (Critical): Week 1
- Phase 2 (High): Week 1
- Phase 3 (High): Week 2
- Phase 4 (Medium): Week 2
- **Total:** 2 weeks

**Pros:**
- ✅ Lower risk - test each phase before next
- ✅ Can pause between phases if issues arise
- ✅ Easier rollback if needed

**Cons:**
- ⚠️ Takes longer (2 weeks)
- ⚠️ Multiple deployments needed

---

### Option B: Single Major Migration

Execute all phases 1-4 in a single migration event.

**Timeline:**
- All phases: 1 week

**Pros:**
- ✅ Faster completion
- ✅ Single deployment event
- ✅ Standards complete sooner

**Cons:**
- ❌ Higher risk - all changes at once
- ❌ Larger rollback scope if issues
- ❌ More complex testing

---

## Risk Mitigation

### Pre-Migration Checklist

- [ ] Backup production database
- [ ] Test migrations in dev environment
- [ ] Create rollback scripts for each phase
- [ ] Update all documentation
- [ ] Notify team of migration schedule

### During Migration

- [ ] Execute migrations during low-traffic window
- [ ] Monitor error logs closely
- [ ] Keep backward-compatible views active
- [ ] Test critical flows immediately

### Post-Migration

- [ ] Run validator against all schemas
- [ ] Execute integration tests
- [ ] Monitor production for 24 hours
- [ ] Remove backward-compatible views after 1 week

---

## New Module Development Gate

**Before starting kb, chat, or wf modules:**

- [ ] ✅ Phase 0 complete (standards documented)
- [ ] ✅ Validator updated and passing
- [ ] Phase 1 complete (critical auth tables) - **OR** skip if starting with module-kb
- [ ] Phase 2 complete (system config tables) - **OR** skip if starting with module-kb
- [ ] Phase 3 complete (workspace config tables) - **OR** skip if starting with module-kb
- [ ] ✅ Phase 4 complete (AI config tables) - **Handled automatically by module-kb Phase 0**
- [ ] All new modules use correct naming from start

**Recommended Path:**
1. **If starting with module-kb:** Phase 4 is handled automatically in module-kb Phase 0. Complete Phases 1-3 afterward if needed.
2. **If migrating existing modules first:** Complete Phases 1-3, skip Phase 4 (it's handled by module-kb).

---

## Success Metrics

- [ ] All config tables use `_cfg_` infix
- [ ] Validator passes on all module schemas
- [ ] No production incidents during migration
- [ ] Rollback not required
- [ ] New modules (kb, chat, wf) use correct naming from inception

---

## Appendix: Lambda Grouping Summary

| Lambda | Tables to Change | Phase | Reason for Grouping |
|--------|------------------|-------|---------------------|
| `idp-config` | `sys_idp_config` + `sys_idp_audit_log` | Phase 1 | Both used by same Lambda |
| `lambda-mgmt` | `sys_lambda_config` | Phase 2 | Single table |
| `workspace` | `ws_configs` + `ws_org_settings` + `ws_activity_log` | Phase 3 | All used by same Lambda |
| `ai-config-handler` | `org_prompt_engineering` + `sys_rag` | module-kb Phase 0 | Both used by same Lambda + prerequisite for module-kb |

**Key Insight:** By grouping tables by Lambda dependency, we touch each Lambda only once during migration. Phase 4 is integrated into module-kb Phase 0 to avoid future migration debt.

---

**Status:** Ready for Execution  
**Next Steps:** 
1. **If implementing module-kb first:** Start with module-kb Phase 0 (handles Phase 4 automatically), then complete Phases 1-3 as needed
2. **If migrating existing modules first:** Complete Phases 1-3 (skip Phase 4), then proceed to module-kb implementation

**Cross-Reference:** [Module-KB Phase 0 - AI Config Table Migration](plan_module-kb-implementation.md#phase-0-prerequisite---ai-config-table-migration-session-103)
