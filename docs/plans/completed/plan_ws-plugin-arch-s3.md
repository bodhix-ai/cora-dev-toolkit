# WS Plugin Architecture (Sprint 3) - Dynamic Module Configuration

**Status**: ✅ COMPLETE  
**Priority**: **P2**  
**Estimated Duration**: 6-8 hours (Phase 0 prerequisite already complete)  
**Created**: 2026-01-25  
**Updated**: 2026-02-03 (Sprint 3 Complete - Core scope achieved)
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
- ✅ Phase 0: Database foundation (mgmt_cfg_sys_modules table migrated)
- ✅ Phase 1: Database schema (org/ws config override tables created)
- ✅ Phase 2: Backend API (org/ws module config endpoints implemented & deployed)
- ✅ Phase 3: Frontend Integration - COMPLETE (Feb 3, 2026)
- ✅ Phase 4: Testing & Documentation - COMPLETE (Feb 3, 2026)

### Goal

1. **Implement org-level config overrides:** Organizations can customize module settings
2. **Implement workspace-level config overrides:** Workspaces can further customize
3. **Real-time updates:** Module availability changes reflect immediately
4. **Dynamic registration UI:** Admin interface for module configuration

---

## Scope

### In Scope

**Phase 0 - Prerequisite (from db-naming-migration):**
- [x] Migrate `sys_module_registry` → `mgmt_cfg_sys_modules` (foundation table)
- [x] Migrate `sys_lambda_config` → `mgmt_cfg_sys_lambda` (same module)
- [x] Update module-mgmt Lambda code
- [x] Create backward-compatible views

**Phases 1-4 - Original S3 Scope:**
- [x] Org-level module config database schema (`mgmt_cfg_org_modules`)
- [x] Workspace-level module config database schema (`mgmt_cfg_ws_modules`)
- [x] Config resolution with cascade (sys → org → ws)
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

## Phase 2: Backend API (2-3h) ✅ COMPLETE

**Status:** ✅ Complete (2026-02-02)  
**Duration:** ~2 hours

### Org-Level Config Endpoints ✅

- [x] `GET /admin/org/mgmt/modules` - List org module config
- [x] `GET /admin/org/mgmt/modules/{name}` - Get single org module config
- [x] `PUT /admin/org/mgmt/modules/{name}` - Update org config
- [x] Authorization: Org admin or sys admin
- [x] Validation: Cannot enable if system disabled
- [x] Uses SQL function: `resolve_all_modules_for_org()` and `resolve_org_module_config()`

### Workspace-Level Config Endpoints ✅

- [x] `GET /admin/ws/{wsId}/mgmt/modules` - List workspace module config
- [x] `GET /admin/ws/{wsId}/mgmt/modules/{name}` - Get single workspace module config
- [x] `PUT /admin/ws/{wsId}/mgmt/modules/{name}` - Update workspace config
- [x] Authorization: Workspace admin, org admin, or sys admin
- [x] Validation: Cannot enable if org/system disabled
- [x] Uses SQL function: `resolve_all_modules_for_workspace()` and `resolve_module_config()`

### Implementation Details ✅

**Lambda:** `templates/_modules-core/module-mgmt/backend/lambdas/lambda-mgmt/lambda_function.py`

**Handler Functions Added:**
1. `_check_org_admin_access()` - Authorization helper for org admin routes
2. `_check_ws_admin_access()` - Authorization helper for workspace admin routes
3. `handle_list_org_modules()` - List all modules with org-level resolution
4. `handle_get_org_module()` - Get single module with org-level resolution
5. `handle_update_org_module()` - Update org-level config override
6. `handle_list_ws_modules()` - List all modules with workspace-level resolution
7. `handle_get_ws_module()` - Get single module with workspace-level resolution
8. `handle_update_ws_module()` - Update workspace-level config override

**Route Dispatcher:** All routes added and mapped to handlers

**Response Format:** Uses `common.success_response()` with resolved module config from SQL functions

**Files Modified:**
- `templates/_modules-core/module-mgmt/backend/lambdas/lambda-mgmt/lambda_function.py` (572 lines added)
- `templates/_modules-core/module-mgmt/infrastructure/outputs.tf` (38 lines added)

**ADR-019 Compliance:** ✅ Centralized router-level auth implemented (lines 108-145)
- Sys admin checks for `/admin/sys/*` routes
- Org context extraction + org admin checks for `/admin/org/*` routes
- Workspace admin checks for `/admin/ws/*` routes

**Test Project Status:**
- ✅ Lambda synced to: `~/code/bodhix/testing/ws-plugin/ai-mod-stack`
- ✅ Lambda built: `lambda-mgmt.zip` (7.1K) + layer (13M)
- ✅ Build artifacts copied to: `~/code/bodhix/testing/ws-plugin/ai-mod-infra/build/module-mgmt/`
- ✅ AWS SSO refreshed
- ✅ Lambda deployed to AWS (deploy-all.sh completed successfully)

**Next Steps:** 
1. Re-run validation to verify ~43 errors resolved
2. If validation passes, proceed to Phase 3 (Frontend Integration)
3. Create org admin module config UI
4. Update WorkspacePluginProvider with org/ws config resolution

---

## Phase 3: Frontend Integration (2-3h) � READY TO START

**Status:** � READY TO START - Lambda deployed successfully

**Prerequisites Met:**
- ✅ Lambda deployed to AWS
- ✅ API endpoints available
- ✅ Auth patterns verified (ADR-019 compliant)

**CRITICAL:** All Phase 3 components MUST follow ADR-019 auth standards to avoid validation errors.

### ADR-019 Compliance Requirements

**Org Admin Page** (`/admin/org/mgmt/modules`) - Layer 1 Admin Authorization:
- **Frontend Standard:** `docs/standards/01_std_front_AUTH.md`
- **Backend Standard:** `docs/standards/03_std_back_AUTH.md`
- **Decision:** `docs/arch decisions/ADR-019-AUTH-STANDARDIZATION.md`

**Required Pattern:**
```tsx
// Must use useRole() + useOrganizationContext()
const { isOrgAdmin, isLoading: roleLoading } = useRole();
const { currentOrg, isLoading: orgLoading } = useOrganizationContext();

// Must check loading states
if (roleLoading || orgLoading) return <LoadingSpinner />;

// Must check authorization
if (!isOrgAdmin) return <UnauthorizedPage />;
```

**Workspace Settings** - Layer 2 Resource Permissions:
- **Standard:** `docs/standards/03_std_back_RESOURCE-PERMISSIONS.md`
- **Decision:** `docs/arch decisions/ADR-019c-AUTH-RESOURCE-PERMISSIONS.md`

**Required Pattern:**
```tsx
// Backend handles permission check
// Frontend only needs workspace context
const { modules, updateConfig } = useWorkspaceModuleConfig(workspaceId);
```

### Update WorkspacePluginProvider

- [x] Fetch resolved config (DONE - useWorkspaceModuleConfig)
- [x] Update moduleAvailability helpers to use resolved config (DONE)
- [ ] ~~Implement auto-refresh on interval (or WebSocket)~~ - DEFERRED to S4
- [x] Loading/error states for config updates (handled by hook)

### Org Admin UI ✅ COMPLETE

- [x] Create `/admin/org/mgmt/modules/page.tsx` (ADR-019 compliant)
- [x] Use `useRole()` + `useOrganizationContext()` hooks
- [x] Implement loading state checks (REQUIRED)
- [x] List all modules with org-level toggles
- [ ] ~~Config override form (JSONB editor or structured form)~~ - DEFERRED (MVP uses toggles only)
- [ ] ~~Feature flag toggles~~ - DEFERRED to S4
- [ ] ~~Save/revert functionality~~ - DEFERRED (auto-save on toggle)

### Workspace Settings UI ✅ COMPLETE

- [x] Create workspace settings module config component
- [x] Use `useWorkspaceModuleConfig(workspaceId)` hook (already exists)
- [x] List available modules for workspace
- [x] Workspace-level toggles (if org/system allows)
- [ ] ~~Config override form~~ - DEFERRED (MVP uses toggles only)
- [ ] ~~Feature flag toggles~~ - DEFERRED to S4

**Prerequisites:**
1. Deploy Lambda (Phase 2 completion) ✅ DONE
2. Test API endpoints work correctly ✅ DONE
3. Verify auth patterns working as expected ✅ DONE

---

## Phase 3b: UI Integration & Dynamic Filtering - DEFERRED TO S4

**Status:** ⏸️ DEFERRED - Core functionality complete, enhancements optional

**CRITICAL:** Phase 3 created UI components but did NOT integrate them into the application.

### Current Status

**System Admin Page:**
- ✅ Component created and synced at `/admin/sys/mgmt/modules/page.tsx`
- ✅ Working and accessible
- ✅ Toggles currently affect left nav (but nav reads from YAML, not database)

**Org Admin Page:**
- ⚠️ Component created and synced at `/admin/org/mgmt/modules/page.tsx`
- ❌ NOT ACCESSIBLE - No admin card at `/admin/org`
- ❌ Route exists but no way to navigate to it

**Workspace Component:**
- ⚠️ Component created at `module-mgmt/frontend/components/WorkspaceModuleConfig.tsx`
- ❌ NOT INTEGRATED - Not in workspace settings tab
- ❌ No way for users to access it

### Integration Tasks

#### 1. Add Org Admin Card (1h) ✅ COMPLETE

- [x] Add admin card config to `cora-modules.config.yaml`
- [x] Card title: "Module Configuration"
- [x] Card path: `/admin/org/mgmt/modules`
- [x] Card visible to org admins only
- [x] Test card appears at `/admin/org`

#### 2. Integrate Workspace Component (1h) ✅ COMPLETE

- [x] Update `module-ws/frontend/pages/WorkspaceDetailPage.tsx`
- [x] Add WorkspaceModuleConfig to Settings tab
- [x] Import component from `@{PROJECT_NAME}/module-mgmt`
- [x] Pass workspaceId prop + onModuleToggled callback
- [x] Test workspace admin can access

#### 3. Left Navigation Dynamic Filtering (2-3h) ⏸️ DEFERRED TO S4

**CRITICAL:** Left nav currently reads from static YAML file, not database.

**Current Implementation:**
- File: `apps/web/lib/moduleRegistry.ts`
- Function: `buildNavigationConfig()`
- Data source: `cora-modules.config.yaml` (static file)
- Check: `show_in_main_nav` flag only

**Required Changes (DEFERRED):**
- [ ] Accept orgId parameter in `buildNavigationConfig(orgId)`
- [ ] Query `mgmt_cfg_sys_modules.is_enabled` for system-level
- [ ] Query `mgmt_cfg_org_modules` for org-level overrides  
- [ ] Apply cascade: sys → org (NOT workspace)
- [ ] Filter nav items based on resolved enablement
- [ ] Cache results per org for performance

**Note:** Workspace-level enablement does NOT affect left nav. Left nav is org-wide - all org users see the same navigation. Only sys and org levels matter.

#### 4. Workspace Tabs Dynamic Filtering (2-3h) ✅ COMPLETE

**Current Implementation:**
- File: `module-ws/frontend/pages/WorkspaceDetailPage.tsx`
- Tabs now filter based on `moduleAvailability` from `useWorkspacePlugin()`

**Completed:**
- [x] Import `useWorkspacePlugin()` to access `moduleAvailability`
- [x] Use `isModuleAvailable()` to filter tabs dynamically
- [x] Show "Docs" tab only if `module-kb` enabled (sys → org → ws)
- [x] Show "Evaluations" tab only if `module-eval` enabled
- [x] Keep "Overview" and "Settings" always visible (built-in)
- [x] Tabs update immediately when modules toggled (via onModuleToggled callback)

**Missing Tabs (Future):**
- [ ] Create voice tab component
- [ ] Create chat tab component

#### 5. Overview Tab Dynamic Metrics (1h) ⏸️ DEFERRED TO S4

**CRITICAL:** Overview tab metrics are hardcoded.

**Current Implementation:**
- Location: `WorkspaceDetailPage.tsx` - TabPanel 0
- Hardcoded: Documents (KB) and Evaluations (Eval)

**Required Changes (DEFERRED):**
- [ ] Check `isModuleAvailable('module-kb')` before showing Documents
- [ ] Check `isModuleAvailable('module-eval')` before showing Evaluations
- [ ] Don't attempt to fetch data for disabled modules
- [ ] Add metrics for voice/chat when enabled (future)

### Success Criteria

- [x] Org admin can access module config via admin card at `/admin/org`
- [x] Workspace admin can access module config in settings tab
- [ ] ~~Left nav filters based on sys → org enablement (not YAML)~~ - DEFERRED
- [x] Workspace tabs filter based on sys → org → ws enablement
- [ ] ~~Overview metrics only show for enabled modules~~ - DEFERRED
- [ ] ~~No data fetching for disabled modules~~ - DEFERRED

---

## Phase 4: Testing & Documentation (1h) ✅ COMPLETE

- [x] Test org-level config cascade (Feb 3, 2026)
- [x] Test workspace-level config cascade (Feb 3, 2026)
- [x] Test dynamic tab visibility (Feb 3, 2026)
- [x] Update ADR-017 with Sprint 3 implementation (Feb 3, 2026)
- [ ] ~~Update MODULE-AVAILABILITY-INTEGRATION guide~~ (Deferred - guide adequate)
- [ ] ~~Create admin guide for module configuration~~ (Deferred - not needed for MVP)

---

## Success Criteria

- [x] Org admins can enable/disable modules for their organization
- [x] Workspace admins can enable/disable modules for their workspace (if org allows)
- [x] Config cascade works correctly (sys → org → ws)
- [x] Workspace tabs dynamically show/hide based on module enablement
- [x] Tab visibility updates immediately after toggle (without browser refresh)
- [x] TypeScript compilation passes
- [x] Documentation complete (ADR-017 updated)

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

---

## Session Notes - February 2-3, 2026

### Session 1: Phase 2 Deployment (Earlier)
**Work Completed:**
- Fixed 4 files in templates (1 TypeScript error, 2 frontend auth errors, 1 Lambda with ADR-019 compliance)
- Synced all fixes to ws-plugin test project
- Built Lambda successfully (verified ADR-019 patterns in both source and built Lambda)
- Copied build artifacts to infra repo
- User refreshed AWS SSO and deployed successfully (deploy-all.sh)
- Lambda is now live in AWS

### Session 2: Systemic Layer Build Fix (Late Evening)
**Critical Infrastructure Issue Discovered and Fixed:**
- User reported Lambda error blocking login: "No module named 'access_common'"
- Investigation revealed SYSTEMIC ISSUE: **ALL modules had module-specific layers that weren't being built!**

**Modules Fixed (5 build scripts):**
1. ✅ module-access: Added `access_common` layer build (1.4K)
2. ✅ module-chat: Added `chat_common` layer build (2.1K)
3. ✅ module-eval: Added `eval_common` layer build (2.6K)
4. ✅ module-kb: Added `kb_common` layer build (1.1K)
5. ✅ module-ws: Added `ws_common` layer build (2.2K)

**Work Completed:**
- Updated 5 module build scripts in templates (permanent fix)
- Copied all updated build scripts to ws-plugin test project
- Rebuilt all modules successfully (all 9 layers now present)
- Copied all artifacts to infra build directory
- User running `deploy-all.sh` to deploy layers and Lambdas

**Root Cause:**
- Auth fixes (ADR-019) added module-specific layers for permissions helpers
- Build scripts weren't updated to build these new layers
- Only appeared in newly created test projects from templates
- Production (pm-app) likely has manual fixes or different deployment process

**Impact:**
- **Templates now fixed** - All future CORA projects will build layers correctly
- **Test project ready** - Deployment in progress
- Login should work after deployment completes

**Next Session Should:**
1. **Test login** - Verify "No module named 'access_common'" error is resolved
2. If login works: Continue with Phase 3 (Frontend Integration) - 50% already done!
3. If login still fails: Check CloudWatch logs and troubleshoot

**Phase 3 Remaining Work (50% complete):**
- ✅ DONE: Updated WorkspacePluginProvider to fetch org/ws resolved configs (useWorkspaceModuleConfig)
- ✅ DONE: Created useOrgModuleConfig and useWorkspaceModuleConfig hooks
- ✅ DONE: Create org admin module config UI page
- ✅ DONE: Create workspace settings module config UI

### Session 3: API Tracer Validator Enhancements (Afternoon)
**Work Completed:**
- Enhanced `api-tracer` reporting to support S3 auth compliance
- Implemented frontend scope breakdown (Sys/Org/Ws) in validation report
- Added module grouping for clearer issue tracking
- Implemented summarized view by default (preventing 700+ line output)
- Added `--verbose` flag support
- Verified with live testing against test project

**Impact:**
- Developers can now easily verify if their new admin pages are ADR-019 compliant
- Validation output is now readable and actionable
- General (shared) issues separated from module-specific issues
