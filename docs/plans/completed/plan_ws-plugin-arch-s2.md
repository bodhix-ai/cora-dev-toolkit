# WS Plugin Architecture (Sprint 2) - Module Registry Integration

**Status**: 🚀 In Progress  
**Priority**: **P2**  
**Estimated Duration**: 4-6 hours  
**Created**: 2026-01-25  
**Updated**: 2026-01-25 (Revised based on discovery of existing module-mgmt infrastructure)  
**Branch**: `feature/ws-plugin-arch-s2`  
**Context**: `memory-bank/context-ws-plugin-architecture.md`  
**Dependencies**: Sprint 1 (Complete) ✅

---

## Naming Pattern (Initiative-Wide Consistency)

All sprints in the **WS Plugin Architecture** initiative follow this naming pattern:

- **Branch:** `feature/ws-plugin-arch-s{N}`
- **Plan:** `docs/plans/plan_ws-plugin-arch-s{N}.md`
- **Context:** `memory-bank/context-ws-plugin-architecture.md` (shared)

**Examples:**
- Sprint 1: `feature/ws-plugin-arch-s1` / `plan_ws-plugin-arch-s1.md`
- Sprint 2: `feature/ws-plugin-arch-s2` / `plan_ws-plugin-arch-s2.md`
- Sprint 3: `feature/ws-plugin-arch-s3` / `plan_ws-plugin-arch-s3.md`

---

## Executive Summary

Sprint 2 integrates the **module registry system** (module-mgmt) with **workspace plugin architecture** (Sprint 1). This establishes module availability checking and prepares for config inheritance (sys → org → ws).

### Key Discovery

During planning, we discovered that **module-mgmt already has complete module registry infrastructure**:
- ✅ `sys_module_registry` database table
- ✅ `/api/platform/modules` API endpoint
- ✅ `useModuleRegistry` hook with module availability checking
- ✅ `ModuleGate` and `ModuleConditional` components

**Revised Goal:** Connect these systems instead of building from scratch.

### Current State

- ✅ Sprint 1 Complete: Workspace plugin architecture established
- ✅ module-mgmt has module registry (is_enabled, is_installed, config, featureFlags)
- ✅ WorkspacePluginContext provides workspace-specific context
- ❌ No integration between workspace-plugin and module-mgmt
- ❌ Plugins can't check module availability
- ❌ No org-level config override structure

### Goal

1. **Integrate module availability:** Connect WorkspacePluginContext to module-mgmt
2. **Shell-level filtering:** Use ModuleGate to conditionally render plugins
3. **Prepare for org overrides:** Define structure for future org-level config

---

## Scope

### In Scope

- [ ] Extend WorkspacePluginContext with module availability
- [ ] Connect WorkspacePluginProvider to useModuleRegistry
- [ ] Add helper functions: isModuleAvailable(), getModuleConfig()
- [ ] Document integration pattern
- [ ] Define org-level config override structure (types only, no implementation)

### Out of Scope

- Module registration / dynamic enablement (Sprint 3)
- Org-level config override implementation (future sprint)
- Org admin UI for module config (separate UX work)
- Workspace-level config overrides (future sprint)

---

## Phase 1: Extend WorkspacePluginContext (1-2h)

### 1.1 Update Types

Add module availability to `WorkspacePluginContext`:

```typescript
// packages/shared/workspace-plugin/types.ts
export interface WorkspacePluginContext {
  // Existing from Sprint 1
  workspaceId: string;
  workspace?: { id, name, color, icon };
  navigation: { labelSingular, labelPlural, icon };
  features: { favoritesEnabled, tagsEnabled, colorCodingEnabled };
  userRole?: 'ws_owner' | 'ws_admin' | 'ws_user';
  
  // NEW: Module availability (from sys_module_registry)
  moduleAvailability: {
    /**
     * Check if a module is available (installed AND enabled)
     */
    isModuleAvailable: (moduleName: string) => boolean;
    
    /**
     * Get module configuration
     */
    getModuleConfig: (moduleName: string) => ModuleConfig | null;
    
    /**
     * List of enabled modules
     */
    enabledModules: string[];
  };
}

/**
 * Module configuration from sys_module_registry
 */
export interface ModuleConfig {
  name: string;
  displayName: string;
  isEnabled: boolean;
  isInstalled: boolean;
  config: Record<string, unknown>;
  featureFlags: Record<string, boolean>;
}

/**
 * Config resolution (future: org/workspace overrides)
 */
export interface ModuleConfigResolution {
  systemConfig: ModuleConfig;
  orgOverride?: Partial<ModuleConfig>; // Future
  workspaceOverride?: Partial<ModuleConfig>; // Future
  resolved: ModuleConfig;
}
```

---

## Phase 2: Connect to module-mgmt (1-2h)

### 2.1 Update WorkspacePluginProvider

Update `apps/web` to integrate `useModuleRegistry`:

```typescript
// apps/web/src/providers/WorkspacePluginProvider.tsx
import { useModuleRegistry } from '@{project}/module-mgmt';

export function WorkspacePluginProvider({ workspaceId, children }) {
  const { modules, isLoading } = useModuleRegistry({ autoFetch: true });
  
  const moduleAvailability = useMemo(() => {
    const enabledModules = modules
      .filter(m => m.isEnabled && m.isInstalled)
      .map(m => m.name);
    
    return {
      isModuleAvailable: (moduleName: string) => 
        enabledModules.includes(moduleName),
      
      getModuleConfig: (moduleName: string) => {
        const module = modules.find(m => m.name === moduleName);
        return module ? {
          name: module.name,
          displayName: module.displayName,
          isEnabled: module.isEnabled,
          isInstalled: module.isInstalled,
          config: module.config,
          featureFlags: module.featureFlags,
        } : null;
      },
      
      enabledModules,
    };
  }, [modules]);
  
  return (
    <WorkspacePluginContext.Provider value={{ 
      workspaceId, 
      moduleAvailability,
      // ... other context 
    }}>
      {children}
    </WorkspacePluginContext.Provider>
  );
}
```

### 2.2 Add Shell-Level Module Filtering

Use `ModuleGate` to conditionally render plugins:

```tsx
// apps/web workspace layout
import { ModuleGate } from '@{project}/module-mgmt';

<WorkspacePluginProvider workspaceId={workspaceId}>
  <ModuleGate moduleName="module-kb" fallback={null}>
    <KBPlugin />
  </ModuleGate>
  
  <ModuleGate moduleName="module-chat" fallback={null}>
    <ChatPlugin />
  </ModuleGate>
  
  <ModuleGate moduleName="module-eval" fallback={null}>
    <EvalPlugin />
  </ModuleGate>
</WorkspacePluginProvider>
```

---

## Phase 3: Prepare Org-Level Override Structure (1h)

### 3.1 Define Types (No Implementation)

```typescript
// packages/shared/workspace-plugin/types.ts

/**
 * Future: Org-level module configuration overrides
 * 
 * Orgs can override system-level module configs.
 * For now, this is a placeholder for future implementation.
 */
export interface OrgModuleConfig {
  orgId: string;
  moduleName: string;
  isEnabled: boolean; // Org can disable modules for their org
  config?: Record<string, unknown>; // Org-specific config overrides
  featureFlags?: Record<string, boolean>; // Org-specific feature flags
}

/**
 * Future: Workspace-level module configuration overrides
 * 
 * Workspaces can override org/system-level module configs.
 * For now, this is a placeholder for future implementation.
 */
export interface WorkspaceModuleConfig {
  workspaceId: string;
  moduleName: string;
  config?: Record<string, unknown>; // Workspace-specific config overrides
  featureFlags?: Record<string, boolean>; // Workspace-specific feature flags
}
```

### 3.2 Document Inheritance Pattern

```
Module Config Cascade (Future Implementation):

1. System Level (sys_module_registry):
   - is_installed: true/false (module deployed?)
   - is_enabled: true/false (SysAdmin toggle)
   - config: { ... }
   - featureFlags: { ... }

2. Org Level (org_module_config - future):
   - Can disable modules for their org
   - Can override system config
   - Can override feature flags
   - Inherits from system if not overridden

3. Workspace Level (ws_module_config - future):
   - Can override org config
   - Can override feature flags
   - Cannot enable if org/system disabled
   - Inherits from org → system cascade

Example:
  System: { feature: "default", limit: 100 }
  Org Override: { limit: 200 }
  Workspace Override: { feature: "custom" }
  Resolved: { feature: "custom", limit: 200 }
```

---

## Phase 4: Documentation & Testing (1h)

- [ ] Update ADR-017 with module availability integration
- [ ] Document shell-level module filtering pattern
- [ ] Document config inheritance structure (for future)
- [ ] Test in created project
- [ ] Update context with session log

---

## Success Criteria

- [ ] WorkspacePluginContext includes module availability
- [ ] WorkspacePluginProvider fetches module registry on load
- [ ] Plugins can check if modules are available
- [ ] Shell uses ModuleGate to conditionally render plugins
- [ ] Types defined for future org/workspace config overrides
- [ ] Documentation explains integration and future config cascade

---

## Architecture Decisions

### Decision 1: Shell-Level vs Plugin-Level Filtering

**Chosen:** Shell-level filtering (Option B)

**Rationale:**
- Cleaner architecture: Plugins don't need module-mgmt dependency
- Single responsibility: Shell handles availability, plugins handle functionality
- Performance: One check at shell level vs. N checks per plugin
- Already exists: ModuleGate component already implements this pattern

### Decision 2: API Endpoint

**Chosen:** Use existing `/api/platform/modules`

**Rationale:**
- Already has all required data: isEnabled, isInstalled, config, featureFlags
- Already integrated with useModuleRegistry hook
- Avoid API proliferation

### Decision 3: Caching Strategy

**Chosen:** React state + context-level caching

**Rationale:**
- Module availability rarely changes
- Fetch once on app load (useModuleRegistry already does this)
- Invalidate on admin config change (add refresh trigger)
- Simple and performant

---

## Rollback Plan

If the approach introduces regressions:

1. Revert the commit(s) on `feature/ws-plugin-arch-s2`
2. Keep only type definitions (if helpful for future work)
3. Return to Sprint 1 baseline

---

## Integration with Admin Standardization

The admin standardization project is implementing module enablement toggles via the module-mgmt admin config page, which updates `sys_module_registry.is_enabled`.

**Sprint 2 Integration Points:**
- Module availability checks `is_installed AND is_enabled`
- Admin config changes should trigger module registry refresh
- Future: Org-level overrides will integrate with licensing/paywall system

---

## Notes

- Module-mgmt already has complete infrastructure (discovered during planning)
- Sprint 2 is integration work, not building from scratch
- Config inheritance is prepared but not implemented (future sprint)
- Org/workspace overrides are type-defined but not implemented