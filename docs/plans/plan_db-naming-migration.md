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

## Validator Whitelist Status (Updated: January 28, 2026)

### ✅ Completed Migrations (Removed from Whitelist)

**Phase 2: System Config Tables (module-mgmt) - ✅ COMPLETE**
- ✅ `sys_lambda_config` → Migrated to `mgmt_cfg_sys_lambda`
- ✅ `sys_module_registry` → Migrated to `mgmt_cfg_sys_modules`
- ✅ `sys_module_usage` → Migrated to `mgmt_usage_modules`
- Legacy schema files archived in templates (Session 15 - January 28, 2026)

**Phase 6: Usage Tracking Tables - ✅ COMPLETE**
- ✅ `sys_module_usage_daily` → Migrated to `mgmt_usage_modules_daily`

**Module-AI Index Naming - ✅ COMPLETE**
- ✅ Index 'FOR' false positive resolved (template already correct: `idx_ai_models_vendor`)
- Database migration applied: `scripts/migrations/20260128_fix_model_vendor_index.sql`
- Session 15 - January 28, 2026

**Module-KB - ✅ COMPLETE**
- ✅ `chat_session_kb` → `chat_session_kbs` - Fixed in templates (Session 151)

### ⏸️ Remaining Whitelisted Items (Deferred)

**Phase 1: Critical Auth Tables (module-access) - Can move to Cognito/OIDC**
- `sys_idp_config` → Will be migrated to `access_cfg_sys_idp` (Cognito Phase 0)
- `sys_idp_audit_log` → Will be migrated to `access_log_idp_audit` (Cognito Phase 0)

**Phase 3: Workspace Tables (Deferred - Workspace Integration)**
- `ws_activity_log` → Should use `ws_log_activity` (Rule 8 infix pattern)
- Module-ws templates need updating (not yet fully templated)

**Phase 5: Log/History Tables (Deferred - Low Priority)**
- `user_auth_log` → Will be migrated to `user_log_auth`
- `ai_model_validation_history` → Will be migrated to `ai_hist_model_validation`
- `ai_model_validation_progress` → Will be migrated to `ai_state_validation`

### Whitelist Removal Process

✅ **Completed:** Removed Phase 2, Phase 6, module-ai index, module-kb items from validator whitelist  
⏸️ **Remaining:** Phase 1 (auth), Phase 3 (workspace), Phase 5 (log/history) - will be removed as phases complete

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

### Phase 1: Critical Auth Tables → CAN BE MOVED TO COGNITO/OIDC

**Status:** ⏳ Can be integrated with `docs/plans/backlog/plan_cognito-external-idp-migration.md` (Phase 0)  
**Risk Level:** ❌ CRITICAL - Auth system dependency  
**Duration:** Integrated with Cognito implementation  
**Lambda Impact:** `module-access/idp-config` only

**Rationale:** When implementing Cognito (the new default auth provider), module-access IDP tables will be updated anyway. Migrating these tables as Phase 0 of Cognito implementation follows the "touch each module once" principle.

**Recommended:** Integrate this phase with Cognito/OIDC migration to avoid touching module-access twice.

#### Tables to Migrate

| Current Name | New Name | Type | Can Move To |
|--------------|----------|------|-------------|
| `sys_idp_config` | `access_cfg_sys_idp` | Config | Cognito/OIDC Phase 0 |
| `sys_idp_audit_log` | `access_log_idp_audit` | Log | Cognito/OIDC Phase 0 |

**Note:** Corrected table names use `access_` prefix (module-access owns these tables) instead of `sys_` prefix per ADR-011 standards.

**See:** `docs/plans/backlog/plan_cognito-external-idp-migration.md` - Phase 0 for complete migration details with corrected table names.

**If implementing this phase standalone** (not integrated with Cognito), use the migration steps in the Cognito plan but note that table names should use `access_` prefix, not `sys_` prefix.

---

### Phase 2: System Config Tables ✅ COMPLETE

**Status:** ✅ Completed by other team (merged to main)  
**Risk Level:** ⚠️ HIGH - Admin functionality  
**Duration:** 2-3 hours (actual)  
**Lambda Impact:** `module-mgmt/lambda-mgmt` + `module-mgmt/module-registry`

**Rationale:** WS-Plugin S3 needed to migrate `sys_module_registry` as its foundation table. The other team completed these migrations as Phase 0 of WS-Plugin S3.

#### Tables Migrated (by other team)

| Current Name | New Name | Type | Status |
|--------------|----------|------|--------|
| `sys_module_registry` | `mgmt_cfg_sys_modules` | Config | ✅ Complete |
| `sys_lambda_config` | `mgmt_cfg_sys_lambda` | Config | ✅ Complete |

**See:** `docs/plans/plan_ws-plugin-arch-s3.md` - Phase 0 (now marked complete).

**Result:** Module-mgmt tables now compliant. Foundation established for WS-Plugin S3's new config override tables.

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

### Phase 6: Usage Tracking Tables ✅ COMPLETE (Bonus)

**Risk Level:** ✅ LOW - Analytics only  
**Duration:** Completed as part of Phase 2 work  
**Lambda Impact:** None (no code uses these tables yet)

**Status:** ✅ Completed by other team (merged to main)

#### Tables Migrated (by other team - bonus work)

| Current Name | New Name | Type | Status |
|--------------|----------|------|--------|
| `sys_module_usage` | `mgmt_usage_modules` | Usage | ✅ Complete |
| `sys_module_usage_daily` | `mgmt_usage_modules_daily` | Usage | ✅ Complete |

**Note:** The other team completed these migrations alongside the Phase 2 work, even though they were originally deferred. This is a bonus that reduces future migration debt.

#### Post-Migration (Complete)

- ✅ Removed from whitelist
- ✅ Tables now compliant with ADR-011 naming standards
- ✅ Ready for future module usage analytics features

**Result:** No migration needed for usage tracking - already compliant!

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

- [x] All config tables use `_cfg_` infix (Phase 2 complete)
- [x] All usage tables use `_usage_` infix (Phase 6 complete - bonus)
- [ ] All workspace config tables use `_cfg_` infix (Phase 3 pending)
- [ ] All log tables use `_log_` infix (Phase 5 deferred)
- [ ] Validator passes on all module schemas
- [x] No production incidents during Phase 2 & 6 migrations
- [x] Rollback not required for Phase 2 & 6
- [ ] New modules (kb, chat, wf) use correct naming from inception

---

## Appendix: Lambda Grouping Summary

| Lambda | Tables to Change | Phase | Reason for Grouping |
|--------|------------------|-------|---------------------|
| `idp-config` | `sys_idp_config` + `sys_idp_audit_log` | Phase 1 | Both used by same Lambda |
| `lambda-mgmt` | `sys_lambda_config` | Phase 2 ✅ COMPLETE | Single table |
| `module-registry` | `sys_module_registry` + `sys_module_usage` + `sys_module_usage_daily` | Phase 2 ✅ COMPLETE | All owned by module-mgmt |
| `workspace` | `ws_configs` + `ws_org_settings` + `ws_activity_log` | Phase 3 | All used by same Lambda |
| `ai-config-handler` | `org_prompt_engineering` + `sys_rag` | module-kb Phase 0 | Both used by same Lambda + prerequisite for module-kb |

**Key Insight:** By grouping tables by Lambda dependency, we touch each Lambda only once during migration. Phase 4 is integrated into module-kb Phase 0 to avoid future migration debt.

---

**Status:** Partially Complete  
**Progress:** 6 of 13 tables migrated (46% complete)

**Completed Phases:**
- ✅ Phase 0: Standards Foundation (documentation)
- ✅ Phase 2: System Config Tables (by other team - WS-Plugin S3 Phase 0)
- ✅ Phase 4: AI Config Tables (by other team - module-kb implementation)
- ✅ Phase 6: Usage Tracking Tables (by other team - bonus work)

**Remaining Work:**
- Phase 1: Critical Auth Tables (can move to Cognito/OIDC Phase 0) - 2 tables
- Phase 3: Workspace Config Tables - 3 tables
- Phase 5: Log/History Tables (deferred) - 2 tables

**Next Steps:** 
1. **For Cognito/OIDC implementation:** Include Phase 1 (IDP tables) as Phase 0 prerequisite
2. **For workspace features:** Complete Phase 3 (workspace config tables)
3. **For log analytics:** Defer Phase 5 until needed

**Cross-Reference:** 
- [Module-KB Phase 0](plan_module-kb-implementation.md#phase-0-prerequisite---ai-config-table-migration-session-103) - Phase 4 complete
- [WS-Plugin S3 Phase 0](../plan_ws-plugin-arch-s3.md#phase-0-database-foundation---module-mgmt-table-migration) - Phase 2 & 6 complete
- [Cognito/OIDC Phase 0](plan_cognito-external-idp-migration.md#phase-0-database-foundation---idp-table-migration) - Phase 1 pending
