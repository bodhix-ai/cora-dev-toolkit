# ADR-017: Workspace Plugin Architecture

**Status:** Approved  
**Date:** January 25, 2026  
**Updated:** February 3, 2026 (Sprint 4 - Left Nav Filtering & DB Naming)  
**Deciders:** Engineering Team  
**Context:** Establish plugin architecture for functional modules to integrate with workspace (WS) module

---

## Context

The CORA framework has a workspace (WS) module that provides multi-tenancy and scoping infrastructure. Functional modules (kb, chat, eval, voice) need to integrate with workspaces to provide scoped features. Currently, these modules import directly from module-ws, which causes TypeScript compilation issues.

### Current Problem

**Cross-Module Type-Checking Failures:**

When functional modules import from module-ws:

```typescript
// ❌ Current pattern - plugin imports from host
import { useWorkspaceConfig } from "@ai-sec/module-ws";
```

This causes TypeScript to type-check module-ws source files when compiling the functional module. The Session type augmentation defined in `module-ws/frontend/types/next-auth.d.ts` doesn't apply across compilation contexts, resulting in:

- **78 TypeScript errors** of type: `Property 'accessToken' does not exist on type 'Session'`
- Type augmentations lost across package boundaries
- Brittle compilation that breaks when modules are built independently

### Root Cause

**tsconfig path mappings point to SOURCE files (.ts), not compiled declarations (.d.ts):**

```json
{
  "paths": {
    "@ai-sec/module-ws": ["./packages/module-ws/frontend"]
  }
}
```

When module-eval imports from module-ws, TypeScript resolves to source files and performs cross-module type-checking. Module augmentations (like Session.accessToken) are scoped to their compilation context and don't propagate.

### Working Pattern (apps/web)

The apps/web package works correctly because it excludes packages from type-checking:

```json
{
  "exclude": ["../../packages/**/*"]
}
```

This prevents cross-module source type-checking, but it's not a sustainable pattern for modules that need to share types.

---

## Decision Drivers

1. **Type Safety** - Eliminate cross-module type-checking failures
2. **Architectural Clarity** - Clear host/plugin relationship
3. **Maintainability** - Easy to add new workspace-aware modules
4. **Standards Compliance** - Align with CORA module isolation principles
5. **Migration Path** - Minimal disruption to existing code

---

## Decision

**Use composition pattern where apps/web provides workspace context to plugins via React Context, eliminating direct module-ws imports from functional modules.**

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│ apps/web (Composition Layer)                                │
│                                                              │
│  ┌──────────────┐  ┌──────────────────────────────────┐   │
│  │ module-ws    │  │ Workspace Context Provider        │   │
│  │ (Host)       │──▶│ - workspaceId                     │   │
│  └──────────────┘  │ - navigation config               │   │
│                     │ - feature flags                   │   │
│                     │ - workspace metadata              │   │
│                     └────────┬─────────────────────────┘   │
│                              │                              │
│                     ┌────────▼─────────────────────────┐   │
│                     │ Plugin Modules (Consumers)        │   │
│                     │                                   │   │
│                     │ ┌─────────┐  ┌──────────┐       │   │
│                     │ │module-kb│  │module-chat│       │   │
│                     │ └─────────┘  └──────────┘       │   │
│                     │ ┌─────────┐  ┌──────────┐       │   │
│                     │ │module-eval│ │module-voice│      │   │
│                     │ └─────────┘  └──────────┘       │   │
│                     └───────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Plugin Contract Interface

Create a **shared workspace context interface** that plugins consume without importing module-ws:

**Location:** `packages/shared/types/workspace-plugin.ts` (new package)

```typescript
/**
 * Workspace Plugin Context
 * 
 * Interface provided by the workspace host (module-ws) and consumed by
 * workspace-aware plugins (kb, chat, eval, voice).
 * 
 * This interface is the contract between host and plugins, avoiding
 * direct cross-module imports that cause type-checking failures.
 */

export interface WorkspacePluginContext {
  /**
   * Current workspace ID
   */
  workspaceId: string;

  /**
   * Workspace metadata (optional - for display purposes)
   */
  workspace?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };

  /**
   * Navigation configuration
   */
  navigation: {
    labelSingular: string;
    labelPlural: string;
    icon: string;
  };

  /**
   * Feature flags
   */
  features: {
    favoritesEnabled: boolean;
    tagsEnabled: boolean;
    colorCodingEnabled: boolean;
  };

  /**
   * User's role in this workspace
   */
  userRole?: 'ws_owner' | 'ws_admin' | 'ws_user';
}

/**
 * React Context for workspace plugin integration
 */
export interface WorkspacePluginContextValue extends WorkspacePluginContext {
  /**
   * Refresh workspace data
   */
  refresh: () => Promise<void>;

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error state
   */
  error: string | null;
}
```

### Implementation Pattern

**1. Host (module-ws) provides context in apps/web:**

```typescript
// apps/web/app/ws/[id]/layout.tsx
import { WorkspacePluginProvider } from '@/components/WorkspacePluginProvider';
import { useWorkspace, useWorkspaceConfig } from '@ai-sec/module-ws';

export default function WorkspaceLayout({ children, params }) {
  const { workspace } = useWorkspace(params.id);
  const { config } = useWorkspaceConfig();

  return (
    <WorkspacePluginProvider
      workspaceId={params.id}
      workspace={workspace}
      navigation={{
        labelSingular: config.navLabelSingular,
        labelPlural: config.navLabelPlural,
        icon: config.navIcon,
      }}
      features={{
        favoritesEnabled: config.enableFavorites,
        tagsEnabled: config.enableTags,
        colorCodingEnabled: config.enableColorCoding,
      }}
      userRole={workspace.userRole}
    >
      {children}
    </WorkspacePluginProvider>
  );
}
```

**2. Plugins consume context (no module-ws imports):**

```typescript
// packages/module-eval/frontend/pages/EvalDetailPage.tsx
import { useWorkspacePlugin } from '@ai-sec/shared/workspace-plugin';

export function EvalDetailPage() {
  const { workspaceId, navigation, userRole } = useWorkspacePlugin();

  // Use workspace context without importing module-ws
  return (
    <div>
      <h1>{navigation.labelSingular} Evaluations</h1>
      <p>Workspace: {workspaceId}</p>
    </div>
  );
}
```

---

## Alternatives Considered

### Alternative 1: Fix tsconfig to point to .d.ts files

**Approach:** Change path mappings to point to compiled declarations:

```json
{
  "paths": {
    "@ai-sec/module-ws": ["./packages/module-ws/frontend/dist"]
  }
}
```

**Rejected because:**
- Requires build step before type-checking (slower development)
- Doesn't solve architectural coupling issue
- Still allows tight coupling between modules

### Alternative 2: Duplicate types in each module

**Approach:** Copy workspace types into each functional module

**Rejected because:**
- Violates DRY principle
- Type drift risk (definitions get out of sync)
- Maintenance burden when workspace types change

### Alternative 3: Use a monorepo type-only package

**Approach:** Create `@ai-sec/types` package with shared interfaces

**Rejected because:**
- Still allows direct imports (doesn't enforce composition)
- Doesn't address the host/plugin architectural pattern
- Functional modules would still import types directly

---

## Consequences

### Positive

- ✅ **Eliminates TypeScript errors** - No more cross-module type-checking failures
- ✅ **Clear architecture** - Host provides, plugins consume via React Context
- ✅ **Better encapsulation** - Modules don't import each other's internals
- ✅ **Easier testing** - Plugins can be tested with mock context
- ✅ **Scalable pattern** - Easy to add new workspace-aware modules

### Negative

- ⚠️ **Migration required** - Existing code must be updated to use context
- ⚠️ **New package needed** - `packages/shared` for workspace-plugin types
- ⚠️ **Learning curve** - Developers must understand host/plugin pattern

### Neutral

- 📝 **Documentation needed** - Guide for creating workspace-aware modules
- 📝 **Provider boilerplate** - apps/web needs WorkspacePluginProvider component

---

## Migration Path

### Phase 1: Establish Infrastructure (Sprint 1)

1. ✅ Create ADR-017 (this document)
2. ⬜ Create `packages/shared` package with workspace-plugin types
3. ⬜ Create `WorkspacePluginProvider` component in apps/web
4. ⬜ Create `useWorkspacePlugin` hook in shared package

### Phase 2: Migrate Module-Eval (Sprint 1)

1. ⬜ Update module-eval to use `useWorkspacePlugin` instead of importing module-ws
2. ⬜ Remove module-ws import from module-eval
3. ⬜ Verify type-check passes

### Phase 3: Migrate Other Modules (Sprint 2)

1. ⬜ Update module-kb to use workspace plugin context
2. ⬜ Update module-chat to use workspace plugin context
3. ⬜ Update module-voice to use workspace plugin context

### Phase 4: Documentation (Sprint 2)

1. ⬜ Create guide: "Building Workspace-Aware Modules"
2. ⬜ Update module development docs
3. ⬜ Add examples to CORA Patterns Cookbook

---

## Implementation Details

### Shared Package Structure

```
packages/shared/
├── package.json
├── tsconfig.json
├── index.ts
└── workspace-plugin/
    ├── index.ts
    ├── types.ts           # WorkspacePluginContext interface
    ├── context.tsx        # React Context definition
    └── useWorkspacePlugin.ts  # Hook for consuming context
```

### WorkspacePluginProvider (apps/web)

```typescript
// apps/web/components/WorkspacePluginProvider.tsx
import { WorkspacePluginContext as IWorkspacePluginContext } from '@ai-sec/shared/workspace-plugin';
import { WorkspacePluginContext } from '@ai-sec/shared/workspace-plugin';

interface Props {
  workspaceId: string;
  workspace?: IWorkspacePluginContext['workspace'];
  navigation: IWorkspacePluginContext['navigation'];
  features: IWorkspacePluginContext['features'];
  userRole?: IWorkspacePluginContext['userRole'];
  children: React.ReactNode;
}

export function WorkspacePluginProvider({ 
  workspaceId, 
  workspace,
  navigation, 
  features, 
  userRole,
  children 
}: Props) {
  const contextValue = {
    workspaceId,
    workspace,
    navigation,
    features,
    userRole,
    refresh: async () => { /* ... */ },
    loading: false,
    error: null,
  };

  return (
    <WorkspacePluginContext.Provider value={contextValue}>
      {children}
    </WorkspacePluginContext.Provider>
  );
}
```

---

## Validation

### Success Criteria

1. ✅ `pnpm -r run type-check` passes without Session.accessToken errors
2. ✅ Functional modules do not import from module-ws
3. ✅ Workspace context is available in all workspace routes
4. ✅ All existing workspace-scoped features continue to work

### Testing Strategy

1. **Type-check validation** - Run on all packages
2. **Integration testing** - Verify workspace context in each plugin module
3. **E2E testing** - Test workspace-scoped features in apps/web

---

## References

- ADR-013: Core vs Functional Module Classification
- ADR-009: Module UI Integration
- `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`
- `memory-bank/context-ws-plugin-architecture.md`
- `docs/plans/plan_feature-ws-plugin-architecture-s1.md`

---

## Appendix: Current Import Analysis

**Modules currently importing from module-ws:**

1. **module-eval:** `useWorkspaceConfig` in EvalDetailPage.tsx
2. **module-kb:** (to be analyzed)
3. **module-chat:** (to be analyzed)
4. **module-voice:** (to be analyzed)

**Impact:**
- Each import triggers cross-module type-checking
- Each causes Session.accessToken errors when module-ws types are resolved

---

---

## Sprint 2 Addition: Module Availability Integration

**Date:** January 25, 2026  
**Status:** Implemented

### Context

With the workspace plugin architecture established in Sprint 1, Sprint 2 integrates module availability checking from the module registry (`sys_module_registry`). This allows plugins and the shell to check if modules are installed and enabled before rendering features.

### Key Discovery

During Sprint 2 planning, we discovered that **module-mgmt already has complete module registry infrastructure**:
- `sys_module_registry` database table (with `is_enabled`, `is_installed`, `config`, `feature_flags`)
- `/api/platform/modules` API endpoint
- `useModuleRegistry` hook with module availability checking
- `ModuleGate` and `ModuleConditional` components for conditional rendering

**Decision:** Integrate this existing infrastructure with the workspace plugin context rather than building from scratch.

### Extended Plugin Contract

The `WorkspacePluginContext` interface now includes module availability:

```typescript
export interface WorkspacePluginContext {
  // ... existing fields from Sprint 1 ...
  
  /**
   * Module availability (from sys_module_registry)
   * 
   * Provides utilities to check if modules are available and retrieve their configuration.
   * Module availability is determined by: is_installed AND is_enabled.
   */
  moduleAvailability: {
    /**
     * Check if a module is available (installed AND enabled)
     */
    isModuleAvailable: (moduleName: string) => boolean;
    
    /**
     * Get module configuration from sys_module_registry
     */
    getModuleConfig: (moduleName: string) => ModuleConfig | null;
    
    /**
     * List of enabled modules
     */
    enabledModules: string[];
  };
}

export interface ModuleConfig {
  name: string;
  displayName: string;
  isEnabled: boolean;
  isInstalled: boolean;
  config: Record<string, unknown>;
  featureFlags: Record<string, boolean>;
}
```

### Updated WorkspacePluginProvider

The provider now integrates with `useModuleRegistry` to fetch module availability on load:

```typescript
export function WorkspacePluginProvider({ ... }) {
  // Fetch module registry from sys_module_registry
  const { modules, isLoading: modulesLoading } = useModuleRegistry({ 
    autoFetch: true,
    includeDisabled: false,
  });

  // Compute module availability utilities
  const moduleAvailability = useMemo(() => {
    const enabledModules = modules
      .filter(m => m.isEnabled && m.isInstalled)
      .map(m => m.name);
    
    return {
      isModuleAvailable: (moduleName: string) => 
        enabledModules.includes(moduleName),
      getModuleConfig: (moduleName: string) => { ... },
      enabledModules,
    };
  }, [modules]);

  const contextValue = {
    // ... existing fields ...
    moduleAvailability,
    loading: loading || modulesLoading,
  };

  return <WorkspacePluginContext.Provider value={contextValue}>...</>;
}
```

### Shell-Level Module Filtering

**Architecture Decision:** Use shell-level filtering (Option B) rather than plugin-level checks.

**Rationale:**
- Cleaner architecture: Plugins don't need module-mgmt dependency
- Single responsibility: Shell handles availability, plugins handle functionality
- Performance: One check at shell level vs. N checks per plugin
- Already exists: `ModuleGate` component implements this pattern

**Implementation:**

```typescript
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

### Future: Config Inheritance (Org/Workspace Overrides)

Sprint 2 defines types for future org-level and workspace-level config overrides:

**Config Cascade (Future Implementation):**

```
System Level (sys_module_registry):
  ├─ is_installed: true/false (module deployed?)
  ├─ is_enabled: true/false (SysAdmin toggle)
  ├─ config: { ... }
  └─ featureFlags: { ... }

Org Level (org_module_config - future):
  ├─ Can disable modules for their org
  ├─ Can override system config/feature flags
  └─ Inherits from system if not overridden

Workspace Level (ws_module_config - future):
  ├─ Can override org config/feature flags
  ├─ Cannot enable if org/system disabled
  └─ Inherits from org → system cascade
```

**Example:**
```typescript
System:    { feature: "default", limit: 100 }
Org:       { limit: 200 }
Workspace: { feature: "custom" }
Resolved:  { feature: "custom", limit: 200 }
```

### Integration with Admin Standardization

The admin standardization project is implementing module enablement toggles via the module-mgmt admin config page, which updates `sys_module_registry.is_enabled`.

**Integration Points:**
- Module availability checks `is_installed AND is_enabled`
- Admin config changes trigger module registry refresh
- Future: Org-level overrides will integrate with licensing/paywall system

### Sprint 2 Success Criteria

- ✅ `WorkspacePluginContext` includes module availability
- ✅ `WorkspacePluginProvider` fetches module registry on load
- ✅ Plugins can check if modules are available via context
- ✅ Shell uses `ModuleGate` to conditionally render plugins
- ✅ Types defined for future org/workspace config overrides
- ✅ Documentation explains integration and future config cascade

---

---

## Sprint 3 Addition: Dynamic Module Configuration

**Date:** February 3, 2026  
**Status:** Implemented

### Context

With module availability integrated in Sprint 2, Sprint 3 implements the **dynamic module configuration system** allowing org-level and workspace-level config overrides with cascading enablement logic.

### What Was Implemented

**1. Database Schema (Phase 1):**
- `mgmt_cfg_org_modules` - Org-level module config overrides
- `mgmt_cfg_ws_modules` - Workspace-level module config overrides
- `resolve_module_config()` - SQL function for config cascade resolution
- Trigger-based validation preventing enablement if parent level disabled

**2. Backend API (Phase 2):**
- `GET/PUT /admin/org/mgmt/modules/{name}` - Org admin module config
- `GET/PUT /admin/ws/{wsId}/mgmt/modules/{name}` - Workspace admin module config
- ADR-019 compliant centralized router-level auth

**3. Frontend UI (Phase 3):**
- `OrgModuleConfigPage` - Org admin module configuration
- `WorkspaceModuleConfig` - Workspace settings module configuration
- Dynamic workspace tab visibility based on module enablement

### Config Cascade Implementation

The future cascade described in Sprint 2 is now fully implemented:

```
System Level (mgmt_cfg_sys_modules):
  ├─ is_installed: true/false (module deployed?)
  ├─ is_enabled: true/false (SysAdmin toggle)
  ├─ config: { ... }
  └─ feature_flags: { ... }

Org Level (mgmt_cfg_org_modules):
  ├─ is_enabled: true/false/null (can disable, cannot enable if sys disabled)
  ├─ config_overrides: { ... } (merged with system)
  └─ feature_flag_overrides: { ... }

Workspace Level (mgmt_cfg_ws_modules):
  ├─ is_enabled: true/false/null (can disable, cannot enable if org/sys disabled)
  ├─ config_overrides: { ... } (merged with org → sys)
  └─ feature_flag_overrides: { ... }
```

**Cascade Rules:**
1. System disabled → Module unavailable everywhere (cannot override)
2. Org disabled → Module unavailable in that org's workspaces
3. Workspace disabled → Module unavailable in that workspace only

### Updated WorkspacePluginProvider

The provider now uses workspace-resolved config (full cascade):

```typescript
export function WorkspacePluginProvider({ workspaceId, ... }) {
  // Fetch workspace-resolved module config (sys → org → ws cascade)
  const { modules, refreshModules } = useWorkspaceModuleConfig(
    workspaceId,
    { autoFetch: true }
  );

  const moduleAvailability = useMemo(() => ({
    isModuleAvailable: (moduleName: string) => 
      modules.find(m => m.name === moduleName)?.isEnabled ?? false,
    getModuleConfig: (moduleName: string) => 
      modules.find(m => m.name === moduleName) ?? null,
    enabledModules: modules.filter(m => m.isEnabled).map(m => m.name),
  }), [modules]);

  return <WorkspacePluginContext.Provider value={contextValue}>...</>;
}
```

### Dynamic Tab Visibility

Workspace tabs now filter based on module enablement:

```typescript
// WorkspaceDetailPage.tsx
const { moduleAvailability } = useWorkspacePlugin();

const availableTabs = useMemo(() => {
  const tabs = [{ label: "Overview", index: 0 }]; // Always visible
  
  if (moduleAvailability?.isModuleAvailable('module-kb')) {
    tabs.push({ label: "Docs", index: tabs.length });
  }
  if (moduleAvailability?.isModuleAvailable('module-eval')) {
    tabs.push({ label: "Evaluations", index: tabs.length });
  }
  // ... more modules
  
  tabs.push({ label: "Settings", index: tabs.length }); // Always visible
  return tabs;
}, [moduleAvailability]);
```

### Immediate Tab Updates

When modules are toggled in workspace settings, tabs update immediately without browser refresh:

```typescript
// WorkspaceModuleConfig.tsx
interface WorkspaceModuleConfigProps {
  workspaceId: string;
  onModuleToggled?: () => Promise<void>; // Callback to refresh parent
}

// After toggle:
await updateConfig(module.name, { isEnabled: !module.isEnabled });
await refreshModules();        // Update settings table
await onModuleToggled?.();     // Refresh provider → tabs re-render
```

### Sprint 3 Success Criteria

- ✅ Org admins can enable/disable modules for their organization
- ✅ Workspace admins can enable/disable modules for their workspace
- ✅ Config cascade works correctly (sys → org → ws)
- ✅ Workspace tabs dynamically show/hide based on enablement
- ✅ Tab visibility updates immediately after toggle
- ✅ TypeScript compilation passes
- ✅ ADR-019 auth patterns implemented

### Deferred to S5+

- Overview tab metric filtering (needs ADR-020 Module Metrics Standard)
- Config override forms (JSONB editing, feature flags)
- Tab ordering feature (sys → org → ws inheritance)
- Voice/Chat workspace tabs

**Note on Auto-refresh:** No polling/WebSocket needed. The user who makes a config change sees immediate feedback. Other users get fresh data on next page load (acceptable for rare config changes).

---

**Status:** Approved (Sprint 1) + Implemented (Sprint 2 + Sprint 3) + In Progress (Sprint 4)  
**Sprint 4 Scope:** Left navigation dynamic filtering + Database naming compliance (ADR-011)  
**Sprint 5 Scope:** Tab ordering, module metrics standard (ADR-020), config override forms
