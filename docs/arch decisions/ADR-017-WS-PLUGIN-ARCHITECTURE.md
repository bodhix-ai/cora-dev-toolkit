# ADR-017: Workspace Plugin Architecture

**Status:** Proposed  
**Date:** January 25, 2026  
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

**Status:** Proposed  
**Next Steps:** Review and approve ADR, create shared package, implement WorkspacePluginProvider