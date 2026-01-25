# WS Plugin Architecture (Sprint 3) - Dynamic Module Configuration

**Status**: 🟡 IN PROGRESS  
**Priority**: **P2**  
**Estimated Duration**: 6-8 hours  
**Created**: 2026-01-25  
**Branch**: `feature/ws-plugin-arch-s3`  
**Context**: `memory-bank/context-ws-plugin-architecture.md`  
**Dependencies**: Sprint 2 (Complete) ✅

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

- [ ] Org-level module config database schema
- [ ] Workspace-level module config database schema
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

## Phase 1: Database Schema (2h)

### org_module_config Table

- [ ] Create migration for `org_module_config` table
- [ ] Fields: org_id, module_name, is_enabled, config_overrides, feature_flag_overrides
- [ ] RLS policies: Org admins can manage their org's config
- [ ] Default values: Inherit from sys_module_registry

### ws_module_config Table

- [ ] Create migration for `ws_module_config` table
- [ ] Fields: workspace_id, module_name, is_enabled, config_overrides, feature_flag_overrides
- [ ] RLS policies: Workspace admins can manage their workspace config
- [ ] Cascade: Cannot enable if org/system disabled

### Config Resolution Query

- [ ] Create database function: `resolve_module_config(workspace_id, module_name)`
- [ ] Implements cascade: sys → org → ws
- [ ] Returns fully resolved config object
- [ ] Optimized with appropriate indexes

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