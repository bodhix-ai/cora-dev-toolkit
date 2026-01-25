# Module Availability Integration Guide

**Created:** January 25, 2026  
**Sprint:** WS Plugin Architecture - Sprint 2  
**Related:** ADR-017, `memory-bank/context-ws-plugin-architecture.md`

---

## Overview

This guide explains how to use the module availability system integrated in Sprint 2 of the WS Plugin Architecture initiative. The system allows the shell (apps/web) and plugins to check if modules are installed and enabled before rendering features.

---

## Architecture

### System Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `sys_module_registry` | Database table storing module status | module-mgmt DB schema |
| `/api/platform/modules` | API endpoint for module registry | module-mgmt backend |
| `useModuleRegistry` | React hook to fetch modules | module-mgmt frontend |
| `ModuleGate` | Component for conditional rendering | module-mgmt frontend |
| `WorkspacePluginContext` | Workspace context with module availability | shared/workspace-plugin |

### Module Availability Logic

A module is considered **available** if:
```
is_installed = true  AND  is_enabled = true
```

- `is_installed`: Module code is deployed to the system
- `is_enabled`: SysAdmin has enabled the module via admin config page

---

## Usage Patterns

### Pattern 1: Shell-Level Module Filtering (Recommended)

Use `ModuleGate` at the workspace layout level to conditionally render entire plugin modules.

**When to use:** Hiding entire modules based on availability (e.g., don't show KB plugin if module-kb is disabled)

**Implementation:**

```typescript
// apps/web/app/ws/[id]/layout.tsx
import { ModuleGate } from '@{project}/module-mgmt';
import { WorkspacePluginProvider } from '@/components/WorkspacePluginProvider';

export default function WorkspaceLayout({ children, params }) {
  const { workspace } = useWorkspace(params.id);
  const { config } = useWorkspaceConfig();

  return (
    <WorkspacePluginProvider
      workspaceId={params.id}
      workspace={workspace}
      navigation={config.navigation}
      features={config.features}
      userRole={workspace.userRole}
    >
      {/* Shell-level filtering: Only render plugins if modules are available */}
      <ModuleGate moduleName="module-kb" fallback={null}>
        <KBPlugin />
      </ModuleGate>
      
      <ModuleGate moduleName="module-chat" fallback={null}>
        <ChatPlugin />
      </ModuleGate>
      
      <ModuleGate moduleName="module-eval" fallback={null}>
        <EvalPlugin />
      </ModuleGate>
      
      <ModuleGate moduleName="module-voice" fallback={null}>
        <VoicePlugin />
      </ModuleGate>

      {children}
    </WorkspacePluginProvider>
  );
}
```

**Benefits:**
- Single check at shell level (performance)
- Plugins don't need to know about module registry
- Clean separation of concerns
- Easy to add new modules

---

### Pattern 2: Plugin-Level Availability Check

Use `useWorkspacePlugin` within a plugin to check module availability.

**When to use:** Conditional feature rendering within a plugin based on other modules

**Implementation:**

```typescript
// packages/module-eval/frontend/pages/EvalDetailPage.tsx
import { useWorkspacePlugin } from '@{project}/shared/workspace-plugin';

export function EvalDetailPage() {
  const { workspaceId, moduleAvailability } = useWorkspacePlugin();
  
  // Check if KB module is available for grounding
  const hasKB = moduleAvailability.isModuleAvailable('module-kb');
  
  return (
    <div>
      <h1>Evaluation Details</h1>
      <p>Workspace: {workspaceId}</p>
      
      {hasKB && (
        <KBGroundingSection />
      )}
      
      {!hasKB && (
        <p>Knowledge base not available. Enable module-kb to use grounding.</p>
      )}
    </div>
  );
}
```

---

### Pattern 3: Accessing Module Configuration

Retrieve module-specific configuration from `sys_module_registry`.

**When to use:** Need module config or feature flags for runtime behavior

**Implementation:**

```typescript
// packages/module-kb/frontend/components/KBSettings.tsx
import { useWorkspacePlugin } from '@{project}/shared/workspace-plugin';

export function KBSettings() {
  const { moduleAvailability } = useWorkspacePlugin();
  
  const kbConfig = moduleAvailability.getModuleConfig('module-kb');
  
  if (!kbConfig) {
    return <p>KB module not available</p>;
  }
  
  const maxDocuments = kbConfig.config.maxDocuments || 1000;
  const isRAGEnabled = kbConfig.featureFlags.ragEnabled || false;
  
  return (
    <div>
      <h2>KB Configuration</h2>
      <p>Max documents: {maxDocuments}</p>
      <p>RAG enabled: {isRAGEnabled ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

---

### Pattern 4: Dynamic Navigation Based on Enabled Modules

Show navigation items only for enabled modules.

**When to use:** Building dynamic navigation menus

**Implementation:**

```typescript
// apps/web/components/WorkspaceNav.tsx
import { useWorkspacePlugin } from '@{project}/shared/workspace-plugin';
import { useModuleNavigation } from '@{project}/module-mgmt';

export function WorkspaceNav() {
  const { workspaceId } = useWorkspacePlugin();
  const { navItems } = useModuleNavigation();
  
  // navItems only includes enabled modules
  return (
    <nav>
      {navItems.map(item => (
        <Link key={item.moduleName} href={`/ws/${workspaceId}${item.route}`}>
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

---

## API Reference

### WorkspacePluginContext.moduleAvailability

```typescript
interface ModuleAvailability {
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
}

interface ModuleConfig {
  name: string;
  displayName: string;
  isEnabled: boolean;
  isInstalled: boolean;
  config: Record<string, unknown>;
  featureFlags: Record<string, boolean>;
}
```

### useModuleRegistry Hook

```typescript
const { modules, isLoading, error, refreshModules } = useModuleRegistry({
  autoFetch: true,          // Fetch on mount
  includeDisabled: false,   // Only fetch enabled modules
  moduleType: 'functional', // Optional: filter by type
});
```

### ModuleGate Component

```typescript
<ModuleGate 
  moduleName="module-kb"
  fallback={<p>Module not available</p>}
>
  <KBPlugin />
</ModuleGate>
```

---

## Integration with Admin Config

The admin standardization project provides a UI for SysAdmins to toggle `is_enabled` for modules.

### Admin Config Page

**Location:** `/admin/sys/mgmt` (module-mgmt admin page)

**Capabilities:**
- View all registered modules
- Enable/disable modules (updates `sys_module_registry.is_enabled`)
- View module dependencies and tier
- Configure module settings

### Automatic Refresh

When a SysAdmin changes module availability:
1. Admin page updates `sys_module_registry.is_enabled`
2. Frontend module registry cache should be invalidated
3. Plugins re-render based on new availability

**Future:** Implement WebSocket or polling for real-time module availability updates.

---

## Future: Org and Workspace Overrides

Sprint 2 defines types for future config inheritance:

### Org-Level Overrides (Planned)

Orgs will be able to:
- Disable modules for their organization (even if system-enabled)
- Override system-level config/feature flags
- Integrate with licensing/paywall system

**Example:**
```typescript
// Future: org_module_config table
{
  orgId: "org-123",
  moduleName: "module-voice",
  isEnabled: false, // Org disables voice module
  config: { maxSessionMinutes: 30 }
}
```

### Workspace-Level Overrides (Planned)

Workspaces will be able to:
- Override org/system config (within allowed bounds)
- Customize feature flags per workspace
- Cannot enable if org/system disabled

**Example:**
```typescript
// Future: ws_module_config table
{
  workspaceId: "ws-456",
  moduleName: "module-kb",
  config: { maxDocuments: 500 }, // Override org limit
  featureFlags: { ragEnabled: true }
}
```

### Config Cascade

```
System (sys_module_registry):
  { feature: "default", limit: 100 }
       ↓ inherits
Org Override (org_module_config):
  { limit: 200 }
       ↓ inherits  
Workspace Override (ws_module_config):
  { feature: "custom" }
       ↓
Resolved Config:
  { feature: "custom", limit: 200 }
```

---

## Best Practices

### 1. Always Use Shell-Level Filtering for Entire Modules

✅ **DO:**
```typescript
<ModuleGate moduleName="module-kb" fallback={null}>
  <KBPlugin />
</ModuleGate>
```

❌ **DON'T:**
```typescript
// Inside KBPlugin
const { moduleAvailability } = useWorkspacePlugin();
if (!moduleAvailability.isModuleAvailable('module-kb')) {
  return null; // Plugin shouldn't check its own availability
}
```

### 2. Use Plugin-Level Checks for Cross-Module Dependencies

✅ **DO:**
```typescript
// Inside EvalPlugin - check if KB is available
const hasKB = moduleAvailability.isModuleAvailable('module-kb');
```

### 3. Provide Fallback UI for Disabled Modules

✅ **DO:**
```typescript
<ModuleGate 
  moduleName="module-voice" 
  fallback={<EnableModulePrompt moduleName="Voice Interview" />}
>
  <VoicePlugin />
</ModuleGate>
```

### 4. Cache Module Config Locally

If you need module config frequently, cache it:

```typescript
const kbConfig = useMemo(() => 
  moduleAvailability.getModuleConfig('module-kb'),
  [moduleAvailability]
);
```

---

## Troubleshooting

### Module Not Showing Despite Being Enabled

**Check:**
1. `sys_module_registry.is_installed = true`?
2. `sys_module_registry.is_enabled = true`?
3. Module registry cache refreshed after admin change?
4. `ModuleGate` using correct module name?

**Debug:**
```typescript
const { moduleAvailability } = useWorkspacePlugin();
console.log('Enabled modules:', moduleAvailability.enabledModules);
console.log('KB config:', moduleAvailability.getModuleConfig('module-kb'));
```

### ModuleGate Always Rendering Fallback

**Check:**
1. Module name matches exactly (e.g., `"module-kb"` not `"kb"`)
2. `useModuleRegistry` in WorkspacePluginProvider has `includeDisabled: false`
3. Module exists in `sys_module_registry` table

---

## Migration from Legacy Patterns

### Before (Direct Import)

```typescript
// ❌ Old pattern - direct import from module-ws
import { useWorkspaceConfig } from '@ai-sec/module-ws';

export function EvalPage() {
  const { workspaceId } = useWorkspaceConfig();
  // ...
}
```

### After (Workspace Plugin Context)

```typescript
// ✅ New pattern - use workspace plugin context
import { useWorkspacePlugin } from '@ai-sec/shared/workspace-plugin';

export function EvalPage() {
  const { workspaceId, moduleAvailability } = useWorkspacePlugin();
  // ...
}
```

---

## Related Documentation

- **ADR-017:** Workspace Plugin Architecture
- **Context:** `memory-bank/context-ws-plugin-architecture.md`
- **Plan:** `docs/plans/plan_ws-plugin-arch-s2.md`
- **Guide:** `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`

---

**Last Updated:** January 25, 2026  
**Sprint:** WS Plugin Architecture - Sprint 2