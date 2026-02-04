# Migration Plan: Database Naming Standards Compliance

**Status:** 50% Complete  
**Created:** January 14, 2026  
**Updated:** February 4, 2026 (Phase 7 Added - Module Config Tables)  
**Priority:** Pre-requisite for kb, chat, wf module development  
**Related:** [ADR-011](../arch%20decisions/ADR-011-CONFIG-TABLE-NAMING.md), [DATABASE-NAMING](../standards/cora/standard_DATABASE-NAMING.md)

---

## Executive Summary

This plan migrates database tables to comply with ADR-011 DATABASE-NAMING standards (Rule 8 - Specialized Table Patterns). Tables are grouped by Lambda dependency to minimize code changes and risk.

**Key Principle:** Touch each Lambda only once during migration.

### Progress Overview

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ COMPLETE | 11 | **37%** |
| ⚠️ PENDING | 10 | 33% |
| 🔴 DEFERRED | 8 | 27% |
| **TOTAL** | **29** | **100%** |

### Remaining Scope (11 Tables - Estimated 7-11 hours)

**Phase 1 - Auth Tables (2 tables)** - Can defer to Cognito migration:
- `sys_idp_config` → `access_cfg_sys_idp`
- `sys_idp_audit_log` → `access_log_idp_audit`


**Phase 7a - Voice + Access Config Tables (2 tables)** - Single-module configs:
- `voice_configs` → `voice_cfg_org`
- `org_email_domains` → `access_cfg_org_domains`

**Phase 7b - AI Remaining Tables (4 tables)** - All remaining AI module tables:
- `ai_providers` → `ai_cfg_sys_providers`
- `ai_models` → `ai_cfg_sys_models`
- `ai_model_validation_history` → `ai_hist_model_validation`
- `ai_model_validation_progress` → `ai_state_validation`

**Phase 7c - Eval Config Tables (3 tables)** - Multi-table module:
- `eval_doc_types` → `eval_cfg_sys_doc_types`
- `eval_criteria_sets` → `eval_cfg_sys_criteria_sets`
- `eval_criteria_items` → `eval_cfg_sys_criteria_items`

**Phase 8 - Foundation Tables (8 tables)** - DEFERRED to Major Version 2.0:
- `user_profiles` → `access_profiles`
- `user_auth_ext_ids` → `access_auth_ext_ids`
- `user_auth_log` → `access_log_auth`
- `user_invites` → `access_invites`
- `user_sessions` → `access_sessions`
- `orgs` → `access_orgs`
- `org_members` → `access_org_members`
- `workspaces` → `ws_workspaces` (or keep as-is)

**Assessment:** Originally 15 tables requiring ~3 weeks, discovered 22 operational tables + 8 foundation tables. 11 complete, 10 operational pending (~2 weeks), 8 foundation deferred (2-4 weeks if attempted).

---

## Master Migration Tracking Table

| Original Name | Target Name | Type | Module | Status | Completed By | Date |
|---------------|-------------|------|--------|--------|--------------|------|
| **Phase 1 - Auth Tables** |
| `sys_idp_config` | `access_cfg_sys_idp` | Config | module-access | ⚠️ PENDING | Defer to Cognito | - |
| `sys_idp_audit_log` | `access_log_idp_audit` | Log | module-access | ⚠️ PENDING | Defer to Cognito | - |
| **Phase 2 - System Config Tables** |
| `sys_lambda_config` | `mgmt_cfg_sys_lambda` | Config | module-mgmt | ✅ COMPLETE | WS-Plugin S3 | Jan 2026 |
| `sys_module_registry` | `mgmt_cfg_sys_modules` | Config | module-mgmt | ✅ COMPLETE | WS-Plugin S3 | Jan 2026 |
| **Phase 3 - Workspace Config Tables** |
| `ws_configs` | `ws_cfg_sys` | Config | module-ws | ✅ COMPLETE | WS-Plugin S4 | Feb 4, 2026 |
| `ws_org_settings` | `ws_cfg_org` | Config | module-ws | ✅ COMPLETE | WS-Plugin S4 | Feb 4, 2026 |
| `ws_activity_log` | `ws_log_activity` | Log | module-ws | ✅ COMPLETE | WS-Plugin S4 | Feb 4, 2026 |
| **Phase 4 - AI Config Tables** |
| `sys_rag` | `ai_cfg_sys_rag` | Config | module-ai | ✅ COMPLETE | Module-KB Phase 0 | Jan 2026 |
| `org_prompt_engineering` | `ai_cfg_org_prompts` | Config | module-ai | ✅ COMPLETE | Module-KB Phase 0 | Jan 2026 |
| **Phase 6 - Usage Tracking Tables (Bonus)** |
| `sys_module_usage` | `mgmt_usage_modules` | Usage | module-mgmt | ✅ COMPLETE | WS-Plugin S3 (bonus) | Jan 2026 |
| `sys_module_usage_daily` | `mgmt_usage_modules_daily` | Usage | module-mgmt | ✅ COMPLETE | WS-Plugin S3 (bonus) | Jan 2026 |
| **Module-Specific Fixes** |
| `chat_session_kb` | `chat_session_kbs` | Junction | module-kb | ✅ COMPLETE | Module-KB work | Jan 2026 |
| **Phase 7a - Voice + Access Config Tables** |
| `voice_configs` | `voice_cfg_org` | Config | module-voice | ⚠️ PENDING | Future work | - |
| `org_email_domains` | `access_cfg_org_domains` | Config | module-access | ⚠️ PENDING | Future work | - |
| **Phase 7b - AI Remaining Tables** |
| `ai_providers` | `ai_cfg_sys_providers` | Config | module-ai | ⚠️ PENDING | Future work | - |
| `ai_models` | `ai_cfg_sys_models` | Config | module-ai | ⚠️ PENDING | Future work | - |
| `ai_model_validation_history` | `ai_hist_model_validation` | History | module-ai | ⚠️ PENDING | Future work | - |
| `ai_model_validation_progress` | `ai_state_validation` | State | module-ai | ⚠️ PENDING | Future work | - |
| **Phase 8 - Foundation Tables (DEFERRED)** |
| `user_profiles` | `access_profiles` | Entity | module-access | 🔴 DEFERRED | Major Version 2.0 | - |
| `user_auth_ext_ids` | `access_auth_ext_ids` | Junction | module-access | 🔴 DEFERRED | Major Version 2.0 | - |
| `user_auth_log` | `access_log_auth` | Log | module-access | 🔴 DEFERRED | Major Version 2.0 | - |
| `user_invites` | `access_invites` | Entity | module-access | 🔴 DEFERRED | Major Version 2.0 | - |
| `user_sessions` | `access_sessions` | Entity | module-access | 🔴 DEFERRED | Major Version 2.0 | - |
| `orgs` | `access_orgs` | Entity | module-access | 🔴 DEFERRED | Major Version 2.0 | - |
| `org_members` | `access_org_members` | Junction | module-access | 🔴 DEFERRED | Major Version 2.0 | - |
| `workspaces` | `ws_workspaces` (TBD) | Entity | module-ws | 🔴 DEFERRED | Major Version 2.0 | - |
| **Phase 7c - Eval Config Tables** |
| `eval_doc_types` | `eval_cfg_sys_doc_types` | Config | module-eval | ⚠️ PENDING | Future work | - |
| `eval_criteria_sets` | `eval_cfg_sys_criteria_sets` | Config | module-eval | ⚠️ PENDING | Future work | - |
| `eval_criteria_items` | `eval_cfg_sys_criteria_items` | Config | module-eval | ⚠️ PENDING | Future work | - |

---

## Completed Work Summary

### Phase 2: System Config Tables ✅ (January 2026)
- **Completed By:** WS-Plugin S3 team
- **Tables Migrated:** 2 (+ 2 bonus usage tables)
- **Lambda Impact:** `module-mgmt/lambda-mgmt`, `module-mgmt/module-registry`
- **Duration:** 2-3 hours (actual)

### Phase 3: Workspace Config Tables ✅ (February 4, 2026)
- **Completed By:** WS-Plugin S4 team
- **Tables Migrated:** 3 (all workspace tables)
- **Lambda Impact:** `module-ws/workspace`
- **Duration:** ~2 hours (actual)
- **Migration Script:** `module-ws/db/migrations/20260203_adr011_ws_table_renaming.sql`

**Files Modified:**
- ✅ `module-ws/db/schema/003-ws-config.sql` → `003-ws-cfg-sys.sql`
- ✅ `module-ws/db/schema/005-ws-org-settings.sql` → `005-ws-cfg-org.sql`
- ✅ `module-ws/db/schema/006-ws-activity-log.sql` → `006-ws-log-activity.sql`
- ✅ `module-ws/db/schema/009-apply-rls.sql` (updated RLS policies)
- ✅ `module-ws/backend/lambdas/workspace/lambda_function.py` (updated table references)
- ✅ `module-ws/frontend/lib/api.ts` (updated table references)

### Phase 4: AI Config Tables ✅ (January 2026)
- **Completed By:** Module-KB Phase 0 team
- **Tables Migrated:** 2 (AI config tables)
- **Lambda Impact:** `module-ai/ai-config-handler`
- **Duration:** Integrated with module-kb work

### Phase 6: Usage Tracking Tables ✅ (January 2026)
- **Completed By:** WS-Plugin S3 team (bonus work)
- **Tables Migrated:** 2 (usage analytics tables)
- **Lambda Impact:** None (no code uses these yet)

---

## Remaining Work Details

### Phase 1: Critical Auth Tables (2 tables - 1-2 hours)

**Status:** ⚠️ DEFERRED - Can integrate with Cognito/OIDC migration  
**Risk Level:** ❌ CRITICAL - Auth system dependency  
**Lambda Impact:** `module-access/idp-config` only

#### Tables to Migrate

| Current Name | New Name | Type |
|--------------|----------|------|
| `sys_idp_config` | `access_cfg_sys_idp` | Config |
| `sys_idp_audit_log` | `access_log_idp_audit` | Log |

**Note:** Corrected table names use `access_` prefix (module-access owns these tables) instead of `sys_` prefix per ADR-011 standards.

**Recommendation:** Integrate this phase with `docs/plans/backlog/plan_cognito-external-idp-migration.md` Phase 0 to avoid touching module-access twice.

---


### Phase 7a: Voice + Access Config Tables (2 tables - ~2 hours)

**Status:** ⚠️ PENDING - Discovered February 4, 2026  
**Risk Level:** ⚠️ MEDIUM - Module functionality  
**Duration:** ~2 hours estimated  
**Lambda Impact:** 2 Lambdas (voice-configs, access-provisioning)

**Strategy:** Group single-table modules together for efficient batch migration.

#### Tables to Migrate

| Current Name | New Name | Type | Scope | Module | Lambda Impact |
|--------------|----------|------|-------|--------|---------------|
| `voice_configs` | `voice_cfg_org` | Config | Org | module-voice | voice-configs |
| `org_email_domains` | `access_cfg_org_domains` | Config | Org | module-access | access-provisioning |

**Rationale:**
- **`voice_configs`** → `voice_cfg_org` - Stores org-level voice interview configurations (Pipecat JSON config)
- **`org_email_domains`** → `access_cfg_org_domains` - Email domain allowlist per org (user provisioning)

**Testing:**
- [ ] Voice: Test voice interview config CRUD operations
- [ ] Access: Test email domain provisioning and user invitation flow

---

### Phase 7b: AI Remaining Tables (4 tables - ~3 hours)

**Status:** ⚠️ PENDING - Discovered February 4, 2026  
**Risk Level:** ⚠️ MEDIUM - AI functionality  
**Duration:** ~3 hours estimated  
**Lambda Impact:** 3 Lambdas (ai-provider, ai-models, ai-validation)

**Strategy:** Group ALL remaining AI module tables together for efficient module-level migration.

#### Tables to Migrate

| Current Name | New Name | Type | Scope | Module | Lambda Impact |
|--------------|----------|------|-------|--------|---------------|
| `ai_providers` | `ai_cfg_sys_providers` | Config | System | module-ai | ai-provider |
| `ai_models` | `ai_cfg_sys_models` | Config | System | module-ai | ai-models |
| `ai_model_validation_history` | `ai_hist_model_validation` | History | System | module-ai | ai-validation |
| `ai_model_validation_progress` | `ai_state_validation` | State | System | module-ai | ai-validation |

**Rationale:**
- **`ai_providers`** → `ai_cfg_sys_providers` - Platform-level AI provider definitions (AWS Bedrock, Azure OpenAI, Google Vertex)
- **`ai_models`** → `ai_cfg_sys_models` - AI model catalog with provider references
- **`ai_model_validation_history`** → `ai_hist_model_validation` - Model validation history for auditing
- **`ai_model_validation_progress`** → `ai_state_validation` - Current validation progress state

**Testing:**
- [ ] AI: Test AI provider CRUD operations
- [ ] AI: Test model selection and provider association
- [ ] AI: Verify model discovery and validation flows
- [ ] AI: Test validation history queries
- [ ] AI: Verify validation progress state updates

---

### Phase 7c: Eval Config Tables (3 tables - ~2 hours)

**Status:** ⚠️ PENDING - Discovered February 4, 2026  
**Risk Level:** ⚠️ MEDIUM - Evaluation functionality  
**Duration:** ~2 hours estimated  
**Lambda Impact:** 1 Lambda (eval-criteria)

**Strategy:** Keep all eval criteria tables together since they share a single Lambda and have FK relationships.

#### Tables to Migrate

| Current Name | New Name | Type | Scope | Module | Lambda Impact |
|--------------|----------|------|-------|--------|---------------|
| `eval_doc_types` | `eval_cfg_sys_doc_types` | Config | System | module-eval | eval-criteria |
| `eval_criteria_sets` | `eval_cfg_sys_criteria_sets` | Config | System | module-eval | eval-criteria |
| `eval_criteria_items` | `eval_cfg_sys_criteria_items` | Config | System | module-eval | eval-criteria |

**Rationale:**
- **`eval_doc_types`** → `eval_cfg_sys_doc_types` - Document type taxonomy for evaluations
- **`eval_criteria_sets`** → `eval_cfg_sys_criteria_sets` - Evaluation criteria templates (references doc_types)
- **`eval_criteria_items`** → `eval_cfg_sys_criteria_items` - Individual criteria within sets (references sets)

**Note on `eval_doc_sets`:** This table stores transactional data (links evaluations to documents for specific runs) and does NOT require `_cfg_` infix. Keep as-is.

**Testing:**
- [ ] Eval: Test document type CRUD operations
- [ ] Eval: Test criteria set import and management
- [ ] Eval: Test evaluation scoring with migrated criteria
- [ ] Eval: Verify criteria weighting and validation

---

## Validator Whitelist Status (Updated: February 4, 2026)

### ✅ Completed Migrations (Removed from Whitelist)

**Phase 2: System Config Tables (module-mgmt):**
- ✅ `sys_lambda_config` → `mgmt_cfg_sys_lambda`
- ✅ `sys_module_registry` → `mgmt_cfg_sys_modules`
- ✅ `sys_module_usage` → `mgmt_usage_modules`
- Legacy schema files archived in templates (Session 15 - January 28, 2026)

**Phase 3: Workspace Config Tables:**
- ✅ `ws_configs` → `ws_cfg_sys`
- ✅ `ws_org_settings` → `ws_cfg_org`
- ✅ `ws_activity_log` → `ws_log_activity`
- Completed in WS Plugin Architecture S4 (February 4, 2026)

**Phase 6: Usage Tracking Tables:**
- ✅ `sys_module_usage_daily` → `mgmt_usage_modules_daily`

**Module-KB:**
- ✅ `chat_session_kb` → `chat_session_kbs` - Fixed in templates (Session 151)

### ⏸️ Remaining Whitelisted Items (Deferred)

**Phase 1: Critical Auth Tables (module-access):**
- `sys_idp_config` → Will be migrated to `access_cfg_sys_idp` (Cognito Phase 0)
- `sys_idp_audit_log` → Will be migrated to `access_log_idp_audit` (Cognito Phase 0)

**Phase 5: Log/History Tables:**
- `user_auth_log` → Will be migrated to `user_log_auth`
- `ai_model_validation_history` → Will be migrated to `ai_hist_model_validation`
- `ai_model_validation_progress` → Will be migrated to `ai_state_validation`

### Current Outstanding Issues (5 errors)

**Index Naming Issues (NOT whitelisted - template cleanup needed):**
- `module-ai/db/schema/008-model-vendor.sql:18` - Index 'FOR' should be 'idx_FOR'
- `module-voice/db/schema/004-voice-credentials.sql:28` - Index should start with 'idx_'
- `module-voice/db/schema/004-voice-credentials.sql:33` - Index should start with 'idx_'
- `module-eval/db/schema/003-eval-sys-status-options.sql:31` - Index 'for' should be 'idx_for'

**Template Issues:**
- `templates/_module-template/db/schema/001-entity-table.sql:16` - Table 'entity' should be plural 'entities'

---

## Implementation Strategy

### Remaining Work Estimate

| Phase | Tables | Effort | Priority | Recommendation |
|-------|--------|--------|----------|----------------|
| Phase 1 (IDP) | 2 | 1-2 hours | CRITICAL | Defer to Cognito migration |
| Phase 7a (Voice+Access) | 2 | ~2 hours | MEDIUM | Complete before module work |
| Phase 7b (AI All) | 4 | ~3 hours | MEDIUM | Complete before module work |
| Phase 7c (Eval) | 3 | ~2 hours | MEDIUM | Complete before module work |
| Phase 8 (Foundation) | 8 | **2-4 weeks** | 🔴 CRITICAL | **Defer to Major Version 2.0** |
| Template Cleanup | 5 errors | 30 min | LOW | Simple find/replace |
| **TOTAL (Operational)** | **10 tables** | **7-10 hours** | - | ~1.5 days work |
| **TOTAL (with Foundation)** | **18 tables** | **2-4 weeks** | - | ⚠️ **Not feasible in current plan** |

**Original Timeline:** ~3 weeks (15 tables)  
**Current Timeline:** ~2 weeks (22 tables total: 11 complete, 11 pending)  
**Progress:** 50% complete

### Option A: Complete Remaining Work (Recommended if time permits)

**Pros:**
- ✅ Achieve 100% naming compliance
- ✅ Eliminate all technical debt
- ✅ Only ~half day of work remaining
- ✅ Clean slate for future development

**Cons:**
- ⚠️ Requires coordination with auth team (Phase 1)
- ⚠️ Low immediate value (Phase 5 tables rarely used)

### Option B: Defer to Cognito (Status Quo)

**Pros:**
- ✅ Avoid duplicate work (Phase 1 done during Cognito)
- ✅ Focus on higher-priority features

**Cons:**
- ⚠️ Technical debt remains
- ⚠️ Phase 5 tables still non-compliant

---

## Lambda Grouping Summary

| Lambda | Tables to Change | Phase | Status |
|--------|------------------|-------|--------|
| `idp-config` | `sys_idp_config` + `sys_idp_audit_log` | Phase 1 | ⚠️ PENDING |
| `lambda-mgmt` | `sys_lambda_config` | Phase 2 | ✅ COMPLETE |
| `module-registry` | `sys_module_registry` + `sys_module_usage` + `sys_module_usage_daily` | Phase 2 & 6 | ✅ COMPLETE |
| `workspace` | `ws_configs` + `ws_org_settings` + `ws_activity_log` | Phase 3 | ✅ COMPLETE |
| `ai-config-handler` | `org_prompt_engineering` + `sys_rag` | Phase 4 | ✅ COMPLETE |
| `voice-configs` | `voice_configs` | Phase 7a | ⚠️ PENDING |
| `access-provisioning` | `org_email_domains` | Phase 7a | ⚠️ PENDING |
| `ai-provider` | `ai_providers` | Phase 7b | ⚠️ PENDING |
| `ai-models` | `ai_models` | Phase 7b | ⚠️ PENDING |
| `ai-validation` | `ai_model_validation_history` + `ai_model_validation_progress` | Phase 7b | ⚠️ PENDING |
| `eval-criteria` | `eval_doc_types` + `eval_criteria_sets` + `eval_criteria_items` | Phase 7c | ⚠️ PENDING |
| (various) | `user_profiles` + `user_auth_ext_ids` + `user_auth_log` + `user_invites` + `user_sessions` + `orgs` + `org_members` + `workspaces` | Phase 8 | 🔴 DEFERRED |

**Key Insight:** By grouping tables by Lambda dependency, we touch each Lambda only once during migration.

---

## Success Metrics

- [x] All config tables use `_cfg_` infix (Phases 2, 3, 4 complete)
- [x] All usage tables use `_usage_` infix (Phase 6 complete)
- [x] All workspace tables use correct infixes (Phase 3 complete)
- [ ] All log tables use `_log_` infix (Phase 1 & 5 pending)
- [ ] All history tables use `_hist_` infix (Phase 5 pending)
- [ ] Validator passes on all module schemas (5 template errors remaining)
- [x] No production incidents during migrations
- [x] Rollback not required for any completed phase
- [x] New modules (kb, chat, ws) use correct naming from inception

---

## Risk Mitigation

### Pre-Migration Checklist (For Remaining Phases)

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

## Next Steps

### Immediate Actions

1. **Template Cleanup (30 minutes):**
   - Fix 4 index naming issues (simple find/replace)
   - Fix 1 template table name (`entity` → `entities`)
   - Reduces validator errors from 5 → 0

2. **Decision Point:**
   - Complete Phase 1 standalone (1-2 hours), OR
   - Defer Phase 1 to Cognito migration (recommended)

3. **Phase 5 Deferral:**
   - Document Phase 5 as backlog item
   - Revisit when log analytics features needed

### For Cognito/OIDC Implementation

Include Phase 1 (IDP tables) as Phase 0 prerequisite:
- See: `docs/plans/backlog/plan_cognito-external-idp-migration.md`
- Benefit: Single touch of module-access auth infrastructure

---

## Cross-Reference

**Completed Migrations:**
- [Module-KB Phase 0](plan_module-kb-implementation.md#phase-0-prerequisite---ai-config-table-migration-session-103) - Phase 4 complete
- [WS-Plugin S3 Phase 0](plan_ws-plugin-arch-s3.md#phase-0-database-foundation---module-mgmt-table-migration) - Phase 2 & 6 complete
- [WS-Plugin S4 Phase 3](plan_ws-plugin-arch-s4.md#phase-3-database-naming-migration-adr-011-compliance) - Phase 3 complete

**Pending Migrations:**
- [Cognito/OIDC Phase 0](backlog/plan_cognito-external-idp-migration.md#phase-0-database-foundation---idp-table-migration) - Phase 1 pending

**Related Standards:**
- [ADR-011: Table Naming Standards](../arch%20decisions/ADR-011-TABLE-NAMING-STANDARDS.md)
- [Standard: Database Naming](../standards/cora/standard_DATABASE-NAMING.md)

---

## Validation Results (February 4, 2026)

**Database Naming Validator:** 5 errors (down from 15+ originally)
- All migrated tables passing validation (0 errors)
- Remaining 5 errors are template cleanup items (not production)
- 73% of original scope complete

**Impact:**
- ✅ All critical tables (mgmt, ws, ai config) now compliant
- ✅ Zero production naming violations
- ⚠️ 4 pending tables deferred (non-blocking)

---

### Phase 8: Foundation Tables (8 tables - 2-4 weeks) - DEFERRED

**Status:** 🔴 DEFERRED to Major Version 2.0  
**Risk Level:** 🔴 CRITICAL - System-wide impact  
**Duration:** 2-4 weeks estimated (NOT included in current timeline)  
**Lambda Impact:** 50+ Lambda functions, 100+ frontend files

**Why Deferred:**

This phase renames the most fundamental tables in the CORA system. Per ADR-011 standards, these tables should have the `access_` or `ws_` module prefix since they're owned by module-access and module-ws. However, the migration complexity makes this infeasible for the current plan.

#### Tables to Migrate (DEFERRED)

| Current Name | New Name | Type | Module | FK References | Complexity |
|--------------|----------|------|--------|---------------|------------|
| `users` | ⚠️ `auth.users` | Entity | Supabase | N/A | ❌ **Cannot rename** |
| `user_profiles` | `access_profiles` | Entity | module-access | ~50+ | 🔴 **Very High** |
| `user_auth_ext_ids` | `access_auth_ext_ids` | Junction | module-access | ~10+ | 🔴 **High** |
| `user_auth_log` | `access_log_auth` | Log | module-access | ~5+ | 🔴 **Medium** |
| `user_invites` | `access_invites` | Entity | module-access | ~15+ | 🔴 **High** |
| `user_sessions` | `access_sessions` | Entity | module-access | ~20+ | 🔴 **High** |
| `orgs` | `access_orgs` | Entity | module-access | ~100+ | 🔴 **Very High** |
| `org_members` | `access_org_members` | Junction | module-access | ~20+ | 🔴 **High** |
| `workspaces` | `ws_workspaces` | Entity | module-ws | ~80+ | 🔴 **Very High** |

**Impact Assessment:**

- **Estimated effort:** 2-4 weeks (not days!)
- **Files affected:** 50+ schema files, 100+ Lambda functions, 50+ frontend files
- **Foreign key references:** 300+ total across all tables
- **Downtime:** Several hours (not feasible for production)
- **Risk level:** 🔴 CRITICAL - Any mistake affects entire system
- **Testing scope:** Full regression testing required

**Why This Is Different:**

1. **`users` is Supabase's `auth.users`** - We don't control this table, cannot rename
2. **Foundation tables** - Referenced by EVERY module in the system
3. **Massive scope** - 300+ foreign key references across all modules
4. **High risk** - Any mistake breaks authentication, authorization, multi-tenancy
5. **Long downtime** - Migration requires extended maintenance window

**Justification for Deferral:**

These tables are **grandfathered exceptions** to ADR-011 module prefix rule. The risk/effort ratio is too high for the benefit gained. They should be migrated as part of a major version upgrade (CORA 2.0) where:

1. Breaking changes are expected
2. Extended downtime is acceptable
3. Comprehensive testing can be performed
4. Migration can be coordinated with other major refactoring

**Recommendation:** Document as known technical debt, revisit during CORA 2.0 planning.

---

---

## Session Log

### February 4, 2026 - Confirmed Delegation from S5

**Context:**
- During Sprint S5 (Validation Errors), considered addressing 5 template errors as "quick win"
- Template cleanup: 4 index naming issues + 1 table naming issue (30 min estimated)

**Decision:**
- Confirmed this work remains DELEGATED to this plan (not part of S5 scope)
- S5 focuses on low-hanging fruit in validators (role naming, frontend, auth, accessibility)
- Template cleanup is standalone work tracked here

**Errors to Fix (Template Cleanup - 30 minutes):**
1. `templates/_modules-core/module-ai/db/schema/008-model-vendor.sql:18` - Index naming
2. `templates/_modules-functional/module-voice/db/schema/004-voice-credentials.sql:28` - Index missing `idx_` prefix
3. `templates/_modules-functional/module-voice/db/schema/004-voice-credentials.sql:33` - Index missing `idx_` prefix
4. `templates/_modules-functional/module-eval/db/schema/003-eval-sys-status-options.sql:31` - Index naming
5. `templates/_module-template/db/schema/001-entity-table.sql:16` - Table name should be plural

**Next Action:**
- Address template cleanup as separate task (not blocking S5 completion)
- Estimated: 30 minutes for simple find/replace fixes

---

**Status:** 37% Complete (11 of 29 tables migrated)  
**Remaining:** 10 operational tables (~7-10 hours estimated)  
**Deferred:** 8 foundation tables (2-4 weeks if attempted)  
**Recommendation:** Complete operational phases before new module work, defer foundation tables to Major Version 2.0  
**Last Updated:** February 4, 2026 (Session Log Added - Template Cleanup Confirmed as Delegated)
