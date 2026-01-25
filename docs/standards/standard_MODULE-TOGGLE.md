# Standard: Module Toggle Pattern

**Status:** ✅ Active  
**Created:** January 25, 2026  
**Last Updated:** January 25, 2026  
**Related:** ADR-013 (Core Module Criteria), Sprint 3a (Module Management Core)

---

## Overview

This standard defines how CORA modules are classified as **core** (always enabled) or **functional** (toggleable by sys admin), and how UI components respect module enabled state at runtime.

---

## Module Classification

### Core Modules (Non-Toggleable)

Core modules **cannot be disabled** via the UI. They provide foundational capabilities required by all CORA applications.

| Module | Tier | Reason |
|--------|------|--------|
| module-access | 1 | Foundation for authentication & authorization |
| module-ai | 2 | All AI applications require provider management |
| module-ws | 2 | Multi-tenancy foundation |
| module-kb | 3 | RAG is fundamental to AI applications |
| module-mgmt | 3 | Platform management required |

**Database:** `module_type = 'core'` in `sys_module_registry`

### Functional Modules (Toggleable)

Functional modules **can be enabled/disabled** by sys admin via the Module Configuration UI.

| Module | Notes |
|--------|-------|
| module-chat | See hybrid pattern below |
| module-eval | Evaluation features |
| module-voice | Voice interview features |

**Database:** `module_type = 'functional'` in `sys_module_registry`

---

## Module-Chat: Hybrid Pattern

`module-chat` uses a **hybrid classification** to handle schema dependencies while remaining toggleable:

- **Project Creation:** Included in core modules (Tier 3) for database schema ordering
  - Other modules have foreign keys to `chat_` tables
  - Schema must exist even if features are disabled
- **Runtime:** Classified as `functional` in `sys_module_registry`
  - Sys admin can toggle chat features on/off
  - UI components conditionally render based on enabled state

**Why this works:**
- Schema is created during project setup (no dependency issues)
- Features are optional at runtime (cost savings, simplified UX)
- Satisfies both technical constraints and business requirements

---

## Making a Module Toggleable

### Step 1: Database Schema

Set `module_type = 'functional'` in the module registry insert:

```sql
-- templates/_modules-functional/{module-name}/db/schema/002-sys-module-registry.sql
INSERT INTO sys_module_registry (
  module_name,
  display_name,
  module_type,  -- Set to 'functional'
  tier,
  is_enabled,
  ...
) VALUES (
  'module-eval',
  'Evaluation',
  'functional',  -- Toggleable module
  NULL,          -- Functional modules don't have tier
  true,
  ...
);
```

### Step 2: Admin Card Integration

Admin dashboard cards for functional modules must check if the module is enabled:

```tsx
// apps/web/app/admin/sys/SystemAdminClientPage.tsx
import { useModuleEnabled } from '@/modules/module-mgmt';

export function SystemAdminClientPage() {
  // Check if functional modules are enabled
  const isChatEnabled = useModuleEnabled('module-chat');
  const isEvalEnabled = useModuleEnabled('module-eval');
  const isVoiceEnabled = useModuleEnabled('module-voice');

  return (
    <div className="admin-cards-grid">
      {/* Core modules - always visible */}
      <AccessAdminCard />
      <AIAdminCard />
      <KBAdminCard />
      <MgmtAdminCard />
      
      {/* Functional modules - conditionally visible */}
      {isChatEnabled && <ChatAdminCard />}
      {isEvalEnabled && <EvalAdminCard />}
      {isVoiceEnabled && <VoiceAdminCard />}
    </div>
  );
}
```

### Step 3: Navigation Integration

Sidebar navigation items for functional modules must be wrapped in `ModuleGate`:

```tsx
// apps/web/components/Sidebar.tsx
import { ModuleGate } from '@{project}/module-mgmt';

const getModuleFromRoute = (href: string): string | null => {
  const routeToModule: Record<string, string> = {
    "/chat": "module-chat",
    "/eval": "module-eval",
    "/voice": "module-voice",
  };
  return routeToModule[href] || null;
};

// In navigation rendering:
section.items.map((item) => {
  const moduleName = getModuleFromRoute(item.href);
  const navItem = <ListItem>...</ListItem>;

  // Wrap functional module nav items in ModuleGate
  if (moduleName) {
    return (
      <ModuleGate key={item.href} moduleName={moduleName} fallback={null}>
        {navItem}
      </ModuleGate>
    );
  }

  // Core module nav items are always visible
  return navItem;
});
```

### Step 4: Module Configuration UI

Sys admin can toggle functional modules via `/admin/sys/mgmt` → Modules tab:

- **Core modules:** Display "Always Enabled" badge, no toggle
- **Functional modules:** Enable/disable toggle switch
- **Metadata:** Display name, description, version, tier

---

## Integration Points

### 1. Admin Dashboard Cards

**Rule:** Functional module admin cards MUST use `useModuleEnabled()` hook.

**Pattern:**
```tsx
const isModuleEnabled = useModuleEnabled('module-name');
// ...
{isModuleEnabled && <ModuleAdminCard />}
```

### 2. Navigation (Sidebar)

**Rule:** Functional module nav items MUST be wrapped in `<ModuleGate>`.

**Pattern:**
```tsx
<ModuleGate moduleName="module-name" fallback={null}>
  <NavItem />
</ModuleGate>
```

### 3. WS Plugin Architecture

**Future:** Workspace-level module enablement (org-specific overrides).

**Pattern:**
```tsx
// Workspace can disable module even if sys-level enabled
const { enabledModules } = useWorkspaceModules();
const isModuleAvailable = enabledModules.includes('module-name');
```

---

## Validation

Use the `module-toggle-validator` to check compliance:

```bash
# From cora-dev-toolkit root
python -m validation.module_toggle_validator.cli /path/to/project

# Or via cora-validate orchestrator
./validation/cora-validate.py --validators module-toggle
```

**Validates:**
- Core modules have `module_type = 'core'` in schema
- Functional modules have `module_type = 'functional'` in schema
- Admin cards use `useModuleEnabled()` for functional modules
- Core module admin cards are always visible (no conditional)
- Sidebar imports and uses `ModuleGate` for functional modules

---

## Testing Checklist

### Unit Tests

- [ ] `useModuleEnabled('module-name')` returns boolean
- [ ] `ModuleGate` renders children when module enabled
- [ ] `ModuleGate` renders fallback when module disabled
- [ ] Admin cards conditionally render based on module state

### Integration Tests

- [ ] Disable functional module via Module Configuration UI
- [ ] Verify admin card hidden after disable
- [ ] Verify nav item hidden after disable
- [ ] Enable functional module via Module Configuration UI
- [ ] Verify admin card visible after enable
- [ ] Verify nav item visible after enable

### Validation Tests

- [ ] Run `module-toggle-validator` on templates
- [ ] Verify all core modules marked as core
- [ ] Verify all functional modules marked as functional
- [ ] Verify admin cards respect module state

---

## Anti-Patterns

### ❌ Don't hardcode module visibility

```tsx
// BAD: Hardcoded conditional
{someCondition && <EvalAdminCard />}
```

### ✅ Do use useModuleEnabled hook

```tsx
// GOOD: Check module registry
const isEvalEnabled = useModuleEnabled('module-eval');
{isEvalEnabled && <EvalAdminCard />}
```

### ❌ Don't conditionally render core module cards

```tsx
// BAD: Core modules should always be visible
const isKBEnabled = useModuleEnabled('module-kb');
{isKBEnabled && <KBAdminCard />}
```

### ✅ Do always render core module cards

```tsx
// GOOD: Core modules are always enabled
<KBAdminCard />
```

---

## FAQ

### Q: Can I make a core module toggleable?

**A:** No. Core modules provide foundational capabilities and cannot be disabled. If a module should be optional, it should be classified as functional from the start.

### Q: What happens to data when a functional module is disabled?

**A:** Database tables remain intact. Disabling a module only hides UI features and prevents API access. Data is preserved for when the module is re-enabled.

### Q: Can org admins toggle modules?

**A:** Not yet. Module toggles are currently sys-admin only (platform-level). Org-level overrides are planned for future (WS Plugin Architecture).

### Q: Does disabling a module affect other modules?

**A:** Dependencies are tracked in `sys_module_registry.dependencies` (future). Currently, validation prevents disabling if dependents exist.

---

## Related Documentation

- **ADR-013:** Core Module Criteria
- **Sprint 3a Plan:** `docs/plans/plan_admin-page-s3a.md`
- **Module Registry Hook:** `templates/_modules-core/module-mgmt/frontend/hooks/useModuleRegistry.ts`
- **ModuleGate Component:** `templates/_modules-core/module-mgmt/frontend/components/ModuleAwareNavigation.tsx`

---

**Document Status:** ✅ Active  
**Validator:** `validation/module-toggle-validator/`  
**Last Updated:** January 25, 2026