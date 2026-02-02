# WS Plugin Architecture (Sprint 3) - Dynamic Module Configuration

**Status**: 🟡 IN PROGRESS (Phase 1 Complete ✅)  
**Priority**: **P2**  
**Estimated Duration**: 6-8 hours (Phase 0 prerequisite already complete)  
**Created**: 2026-01-25  
**Updated**: 2026-01-25 (Added Phase 0 - DB naming migration integration)  
**Updated**: 2026-01-25 (Phase 0 completed by other team)  
**Updated**: 2026-02-02 (Phase 1 implemented and deployed)  
**Branch**: `feature/ws-plugin-arch-s3`  
**Context**: `memory-bank/context-ws-plugin-architecture.md`  
**Dependencies**: Sprint 2 (Complete) ✅, Phase 0 (Complete) ✅  
**Related Plans**: `docs/plans/backlog/plan_db-naming-migration.md` (Phase 2 completed by other team)

---

## Naming Pattern (Initiative-Wide Consistency)

All sprints in the **WS Plugin Architecture** initiative follow this naming pattern:

- **Branch:** `feature/ws-plugin-arch-s{N}`
- **Plan:** `docs/plans/plan_ws-plugin-arch-s{N}.md`
- **Context:** `memory-bank/context-ws-plugin-architecture.md` (shared)

---

## Executive Summary

Sprint 3 implements the **dynamic module configuration system** for workspace plugins, building on the module availability infrastructure from Sprint 2. This establishes org-level and workspace-level config overrides with real-time updates.

### Current State

- ✅ Sprint 1: Workspace plugin architecture established
- ✅ Sprint 2: Module registry integration complete
- ❌ No org-level or workspace-level config overrides
- ❌ No real-time module availability updates
- ❌ No dynamic module registration UI

### Goal

1. **Implement org-level config overrides:** Organizations can customize module settings
2. **Implement workspace-level config overrides:** Workspaces can further customize
3. **Real-time updates:** Module availability changes reflect immediately
4. **Dynamic registration UI:** Admin interface for module configuration

---

## Scope

### In Scope

**Phase 0 - Prerequisite (from db-naming-migration):**
- [ ] Migrate `sys_module_registry` → `mgmt_cfg_sys_modules` (foundation table)
- [ ] Migrate `sys_lambda_config` → `mgmt_cfg_sys_lambda` (same module)
- [ ] Update module-mgmt Lambda code
- [ ] Create backward-compatible views

**Phases 1-4 - Original S3 Scope:**
- [ ] Org-level module config database schema (`mgmt_cfg_org_modules`)
- [ ] Workspace-level module config database schema (`mgmt_cfg_ws_modules`)
- [ ] Config resolution with cascade (sys → org → ws)
- [ ] Real-time module availability updates (polling or WebSocket)
- [ ] Admin UI for org-level module configuration
- [ ] Workspace settings UI for workspace-level overrides

### Out of Scope

- Licensing/paywall system integration (future)
- Module marketplace (future)
- Custom module development tools (future)
- Module versioning/updates (future)

---

## Phase 0: Database Foundation - Module-Mgmt Table Migration ✅ COMPLETE

**Status:** ✅ Completed by other team (merged to main)

**Context:** This phase integrated scope from the db-naming-migration plan (Phase 2). The other team completed these migrations and merged them to main.

**Related:** See `docs/plans/backlog/plan_db-naming-migration.md` - Phase 2 marked as complete.

### Tables Migrated (by other team)

| Current Name | New Name | Type | Status |
|--------------|----------|------|--------|
| `sys_module_registry` | `mgmt_cfg_sys_modules` | Config | ✅ Complete |
| `sys_lambda_config` | `mgmt_cfg_sys_lambda` | Config | ✅ Complete |
| `sys_module_usage` | `mgmt_usage_modules` | Usage | ✅ Complete (bonus) |
| `sys_module_usage_daily` | `mgmt_usage_modules_daily` | Usage | ✅ Complete (bonus) |

**Note:** The other team also migrated the usage tracking tables (originally deferred to Phase 6 of db-naming-migration plan).

### Migration Steps (Already Complete)

```sql
-- 1. Create new tables with correct naming
CREATE TABLE mgmt_cfg_sys_modules (
    -- Copy structure from sys_module_registry
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    module_type VARCHAR(20) NOT NULL,
    tier INTEGER,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    is_installed BOOLEAN NOT NULL DEFAULT false,
    config JSONB DEFAULT '{}'::jsonb,
    feature_flags JSONB DEFAULT '{}'::jsonb,
    nav_config JSONB DEFAULT '{}'::jsonb,
    dependencies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mgmt_cfg_sys_lambda (
    -- Copy structure from sys_lambda_config
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Copy data
INSERT INTO mgmt_cfg_sys_modules SELECT * FROM sys_module_registry;
INSERT INTO mgmt_cfg_sys_lambda SELECT * FROM sys_lambda_config;

-- 3. Recreate indexes with correct naming
DROP INDEX IF EXISTS idx_sys_module_registry_type;
CREATE INDEX idx_mgmt_cfg_sys_modules_type ON mgmt_cfg_sys_modules(module_type);

DROP INDEX IF EXISTS idx_sys_module_registry_enabled;
CREATE INDEX idx_mgmt_cfg_sys_modules_enabled ON mgmt_cfg_sys_modules(is_enabled);

DROP INDEX IF EXISTS idx_sys_lambda_config_key;
CREATE INDEX idx_mgmt_cfg_sys_lambda_key ON mgmt_cfg_sys_lambda(config_key);

-- 4. Update RLS policies
ALTER TABLE mgmt_cfg_sys_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE mgmt_cfg_sys_lambda ENABLE ROW LEVEL SECURITY;

-- (Copy RLS policies from original tables)

-- 5. Create backward-compatible views (temporary)
CREATE VIEW sys_module_registry AS SELECT * FROM mgmt_cfg_sys_modules;
CREATE VIEW sys_lambda_config AS SELECT * FROM mgmt_cfg_sys_lambda;
```

### Code Changes

**Lambda:** `module-mgmt/backend/lambdas/module-registry/lambda_function.py`
- Update all SQL queries: `sys_module_registry` → `mgmt_cfg_sys_modules`

**Lambda:** `module-mgmt/backend/lambdas/lambda-mgmt/lambda_function.py`
- Update all SQL queries: `sys_lambda_config` → `mgmt_cfg_sys_lambda`

**Template Schema Files:**
- Rename `module-mgmt/db/schema/002-sys-module-registry.sql` → `002-mgmt-cfg-sys-modules.sql`
- Rename `module-mgmt/db/schema/001-sys-lambda-config.sql` → `001-mgmt-cfg-sys-lambda.sql`
- Update table creation statements in both files

### Testing (Completed by other team)

- ✅ Module registry read/write operations tested
- ✅ Lambda warming toggle functionality verified
- ✅ Module availability checks working (used by Sprint 2)
- ✅ RLS policies verified
- ✅ Validator passing

### Post-Migration (Completed by other team)

- ✅ Removed from whitelist
- ✅ Validator passes
- ✅ `plan_db-naming-migration.md` updated

**Result:** Phase 0 prerequisite complete. Sprint 3 can proceed directly to Phase 1.

---

## Phase 1: Database Schema - Config Override Tables (2h) ✅ COMPLETE

**Status:** ✅ Complete (2026-02-02)  
**Duration:** ~1 hour (faster than estimated)

**Note:** These new tables reference the migrated `mgmt_cfg_sys_modules` from Phase 0.

### mgmt_cfg_org_modules Table ✅

- [x] Create schema file `003-mgmt-cfg-org-modules.sql`
- [x] Fields: org_id, module_name, is_enabled, config_overrides, feature_flag_overrides
- [x] RLS policies: Org admins can manage their org's config
- [x] Trigger validation: Cannot enable if system disabled
- [x] Foreign keys: `module_name` → `mgmt_cfg_sys_modules`, `org_id` → `orgs`
- [x] Indexes for performance

### mgmt_cfg_ws_modules Table ✅

- [x] Create schema file `004-mgmt-cfg-ws-modules.sql`
- [x] Fields: ws_id, module_name, is_enabled, config_overrides, feature_flag_overrides
- [x] RLS policies: Workspace admins can manage their workspace config
- [x] Trigger validation: Cannot enable if org/system disabled
- [x] Foreign keys: `module_name` → `mgmt_cfg_sys_modules`, `ws_id` → `workspaces`
- [x] Indexes for performance

### Config Resolution Functions ✅

- [x] Create schema file `005-resolve-module-config.sql`
- [x] `resolve_module_config(p_ws_id, p_module_name)` - Full cascade (sys → org → ws)
- [x] `resolve_org_module_config(p_org_id, p_module_name)` - Org cascade (sys → org)
- [x] `resolve_all_modules_for_workspace(p_ws_id)` - All modules for workspace
- [x] `resolve_all_modules_for_org(p_org_id)` - All modules for org
- [x] JSONB merging for config and feature_flags
- [x] Optimized with appropriate indexes

**Implementation Notes:**
- Replaced CHECK constraints with trigger-based validation (PostgreSQL limitation)
- Fixed table/column naming: `ws_members` and `ws_id` (not `workspace_members`/`workspace_id`)
- All SQL files successfully deployed and tested

---

## Phase 2: Backend API (2-3h)

### Org-Level Config Endpoints

- [ ] `GET /api/platform/orgs/{orgId}/modules` - List org module config
- [ ] `PUT /api/platform/orgs/{orgId}/modules/{moduleName}` - Update org config
- [ ] Authorization: Org admin only
- [ ] Validation: Cannot enable if system disabled

### Workspace-Level Config Endpoints

- [ ] `GET /api/platform/workspaces/{wsId}/modules` - List workspace module config
- [ ] `PUT /api/platform/workspaces/{wsId}/modules/{moduleName}` - Update workspace config
- [ ] Authorization: Workspace admin only
- [ ] Validation: Cannot enable if org/system disabled

### Real-Time Updates

- [ ] Implement polling strategy for module availability refresh
- [ ] Or: WebSocket for real-time push updates
- [ ] Update WorkspacePluginProvider to auto-refresh on config changes
- [ ] Cache invalidation strategy

---

## Phase 3: Frontend Integration (2-3h)

### Update WorkspacePluginProvider

- [ ] Fetch resolved config (not just sys_module_registry)
- [ ] Implement auto-refresh on interval (or WebSocket)
- [ ] Update moduleAvailability helpers to use resolved config
- [ ] Loading/error states for config updates

### Org Admin UI

- [ ] Create `/admin/org/{orgId}/modules` page
- [ ] List all modules with org-level toggles
- [ ] Config override form (JSONB editor or structured form)
- [ ] Feature flag toggles
- [ ] Save/revert functionality

### Workspace Settings UI

- [ ] Create workspace settings module config page
- [ ] List available modules for workspace
- [ ] Workspace-level toggles (if org/system allows)
- [ ] Config override form
- [ ] Feature flag toggles

---

## Phase 4: Testing & Documentation (1h)

- [ ] Test org-level config cascade
- [ ] Test workspace-level config cascade
- [ ] Test real-time updates
- [ ] Update ADR-017 with Sprint 3 implementation
- [ ] Update MODULE-AVAILABILITY-INTEGRATION guide
- [ ] Create admin guide for module configuration

---

## Success Criteria

- [ ] Org admins can enable/disable modules for their organization
- [ ] Workspace admins can enable/disable modules for their workspace (if org allows)
- [ ] Config cascade works correctly (sys → org → ws)
- [ ] Module availability updates reflect in real-time (or near real-time)
- [ ] TypeScript compilation passes
- [ ] Documentation complete

---

## Rollback Plan

If the approach introduces regressions:

1. Revert database migrations
2. Revert API endpoints
3. Revert frontend changes
4. Return to Sprint 2 baseline (system-level only)

---

## Notes

- **Licensing Integration:** Future work will add licensing checks before allowing org to enable modules
- **Paywall:** Future work will integrate with billing system
- **Performance:** Config resolution should be cached at multiple levels
- **Real-Time:** Start with polling (simple), upgrade to WebSocket if needed

---

## Open Questions

1. **Refresh Strategy:** Polling interval (30s? 60s?) or WebSocket?
2. **Config Override UI:** JSONB editor or structured forms?
3. **Feature Flags:** Which flags should be overridable at org/workspace level?
4. **Default Behavior:** When org doesn't have config, inherit from system? (Yes)