# WS Plugin Architecture (Sprint 2) - Config Inheritance System

**Status**: ⏳ Ready to Start  
**Priority**: **P2**  
**Estimated Duration**: 4-6 hours  
**Created**: 2026-01-25  
**Branch**: `feature/ws-plugin-architecture-s2`  
**Context**: `memory-bank/context-ws-plugin-architecture.md`  
**Dependencies**: Sprint 1 (Complete) ✅

---

## Naming Pattern (Initiative-Wide Consistency)

All sprints in the **WS Plugin Architecture** initiative follow this naming pattern:

- **Branch:** `feature/ws-plugin-architecture-s{N}`
- **Plan:** `docs/plans/plan_ws-plugin-architecture-s{N}.md`
- **Context:** `memory-bank/context-ws-plugin-architecture.md` (shared)

**Examples:**
- Sprint 1: `feature/ws-plugin-architecture-s1` / `plan_ws-plugin-architecture-s1.md`
- Sprint 2: `feature/ws-plugin-architecture-s2` / `plan_ws-plugin-architecture-s2.md`
- Sprint 3: `feature/ws-plugin-architecture-s3` / `plan_ws-plugin-architecture-s3.md`

This makes it clear that all sprints are part of the same initiative and differentiated by sprint number.

---

## Executive Summary

Sprint 2 implements the **config inheritance system** for workspace plugins. This establishes the pattern for cascading configuration from system defaults → organization settings → workspace overrides.

### Current State

- ✅ Sprint 1 Complete: Workspace plugin architecture established
- ✅ All modules migrated to plugin pattern
- ❌ No formal config inheritance pattern exists
- ❌ Workspace configs don't inherit from org/system defaults

### Goal

1. **Implement config cascade:** system → org → workspace
2. **Define override patterns:** How workspaces override org settings
3. **Document behavior:** Clear rules for config inheritance

---

## Scope

### In Scope

- [ ] Define config inheritance interface/types
- [ ] Implement system default configs
- [ ] Implement org-level config overrides
- [ ] Implement workspace-level config overrides
- [ ] Document config inheritance behavior
- [ ] Add validation for config inheritance

### Out of Scope

- Module registration / dynamic enablement (Sprint 3)
- Retroactive migration of existing configs (can be done incrementally)
- UI for managing configs (separate UX work)

---

## Phase 1: Define Config Structure (1-2h)

- [ ] Define `SystemConfig` interface (baseline defaults)
- [ ] Define `OrgConfigOverrides` interface (org customization)
- [ ] Define `WorkspaceConfigOverrides` interface (workspace customization)
- [ ] Define `ResolvedConfig` interface (final merged config)
- [ ] Document config inheritance rules

**Key Questions:**
- What configs should be inheritable?
- What configs should be workspace-specific only?
- How do we handle deep merging vs shallow merging?

---

## Phase 2: Implement Config Resolution (2-3h)

- [ ] Create `resolveWorkspaceConfig()` function
- [ ] Implement system defaults
- [ ] Implement org override logic
- [ ] Implement workspace override logic
- [ ] Add config validation
- [ ] Add tests for config resolution

**Example:**
```typescript
// System defaults
const systemDefaults = {
  features: {
    favorites: true,
    tags: true,
    colorCoding: false,
  },
  limits: {
    maxMembers: 50,
    maxDocuments: 1000,
  },
};

// Org overrides
const orgConfig = {
  limits: {
    maxMembers: 100, // Override system default
  },
};

// Workspace overrides
const workspaceConfig = {
  features: {
    colorCoding: true, // Override system default
  },
};

// Resolved config (deep merge)
const resolved = {
  features: {
    favorites: true,      // from system
    tags: true,           // from system
    colorCoding: true,    // from workspace override
  },
  limits: {
    maxMembers: 100,      // from org override
    maxDocuments: 1000,   // from system
  },
};
```

---

## Phase 3: Update Plugin Context (1h)

- [ ] Update `WorkspacePluginContext` to include resolved config
- [ ] Update `WorkspacePluginProvider` to resolve configs
- [ ] Update documentation with config inheritance examples
- [ ] Test in created project

---

## Success Criteria

- [ ] Config inheritance system implemented and documented
- [ ] System → Org → Workspace cascade working correctly
- [ ] Plugin context includes resolved config
- [ ] Validation ensures config integrity
- [ ] Documentation explains config inheritance behavior

---

## Rollback Plan

If the approach introduces regressions:

1. Revert the commit(s) on `feature/ws-plugin-config`
2. Keep only documentation changes (if helpful)
3. Return to Sprint 1 baseline

---

## Notes

- Config inheritance is foundational for multi-tenancy
- Enables org admins to set defaults for all workspaces
- Enables workspace admins to customize their workspace
- Must be performant (resolve on workspace load, cache result)