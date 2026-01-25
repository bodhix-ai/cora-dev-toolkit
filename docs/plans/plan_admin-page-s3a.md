# Plan: Admin Standardization Sprint 3a - Module Management Core

**Status:** 🟡 IN PROGRESS (57% complete - 4/7 steps done)  
**Branch:** `admin-page-s3a`  
**Context:** `memory-bank/context-admin-standardization.md`  
**Priority:** P1 - Unblocks WS Plugin Architecture initiative  
**Created:** January 25, 2026  
**Last Updated:** January 25, 2026 (Session 2)

---

## Overview

Implement the Module Configuration UI and module-aware visibility controls to enable sys admins to toggle functional modules on/off at runtime. This work provides the foundation for the WS Plugin Architecture initiative to read module enabled state.

---

## Scope

### In Scope

1. **Module Configuration Tab** - UI for sys admin to toggle functional modules
2. **Admin Card Integration** - Cards respect module enabled state
3. **Left Nav Integration** - Navigation hides disabled module items
4. **Module-Chat Reclassification** - Change from core to functional (toggleable)
5. **Validation Script** - Validate module toggle compliance
6. **Standard Documentation** - Document module toggle pattern

### Out of Scope

- Admin page parity and documentation standards (Sprint 3b)
- In-app kbdocs integration (Sprint 3c or separate)
- Module dependency validation UI (future enhancement)
- Module version management (future enhancement)

---

## Core Module Classification (Non-Toggleable)

These modules cannot be disabled via the UI:

| Module | Tier | Reason |
|--------|------|--------|
| module-access | 1 | Foundation for all authentication & authorization |
| module-ai | 2 | All AI applications require provider management |
| module-ws | 2 | Multi-tenancy foundation |
| module-kb | 3 | RAG is fundamental to AI applications |
| module-mgmt | 3 | Platform management required |

---

## Functional Modules (Toggleable)

These modules can be enabled/disabled by sys admin:

| Module | Creation Tier | Runtime Type | Notes |
|--------|---------------|--------------|-------|
| **module-chat** | 3 | functional | Schema required (FK refs), feature optional |
| module-eval | - | functional | Evaluation features |
| module-voice | - | functional | Voice interview features |

**Note:** `module-chat` uses hybrid classification:
- **Project creation:** Included in core modules for schema dependency ordering
- **Runtime:** Classified as functional in `sys_module_registry` for toggle capability

---

## Implementation Steps

### Step 1: Reclassify module-chat in Database Schema ✅ COMPLETE

**Files:**
- `templates/_modules-core/module-chat/db/schema/002-sys-module-registry.sql` (if exists)
- `templates/_modules-core/module-mgmt/db/schema/002-sys-module-registry.sql`

**Changes:**
```sql
-- Change module-chat classification
INSERT INTO sys_module_registry (module_name, display_name, module_type, tier, ...)
VALUES ('module-chat', 'Chat & Messaging', 'functional', 3, ...);  -- Changed from 'core' to 'functional'
```

### Step 2: Create Module Configuration Tab Component ✅ COMPLETE

**File:** `templates/_modules-core/module-mgmt/frontend/components/admin/ModuleConfigTab.tsx`

**Requirements:**
- List all registered modules from `useModuleRegistry()`
- Display module type indicators (Core vs Functional badges)
- Core modules show "Always Enabled" badge, no toggle
- Functional modules have enable/disable toggle switch
- Show module metadata: display name, description, version, tier
- Dependency validation UI (future: show why module can't be disabled)
- Confirmation dialog for disable action

**Wireframe:**
```
┌─────────────────────────────────────────────┐
│ Module Configuration                        │
├─────────────────────────────────────────────┤
│ Core Modules (Always Enabled)              │
│ ┌─────────────────────────────────────────┐ │
│ │ 🛡️ module-access                        │ │
│ │ Identity & Access Control               │ │
│ │ Tier 1 | v1.0.0 | ✅ CORE               │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Functional Modules (Toggleable)            │
│ ┌─────────────────────────────────────────┐ │
│ │ 💬 module-chat               [ON/OFF]  │ │
│ │ Chat & Messaging                        │ │
│ │ Tier 3 | v1.0.0 | 🔧 FUNCTIONAL        │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Step 3: Update PlatformMgmtAdmin to Include ModuleConfigTab ✅ COMPLETE

**File:** `templates/_modules-core/module-mgmt/frontend/components/admin/PlatformMgmtAdmin.tsx`

**Changes:**
- Add "Modules" tab to existing tabs (Lambda, Cost, Performance, etc.)
- Import and render `ModuleConfigTab` component
- Use standard tabbed interface pattern

### Step 4: Update Admin Cards for Module-Aware Visibility ✅ COMPLETE

**Files to Update:**
- `templates/_project-stack-template/apps/web/app/admin/sys/SystemAdminClientPage.tsx`
- `templates/_project-stack-template/apps/web/app/admin/org/OrgAdminClientPage.tsx`

**Pattern:**
```tsx
import { useModuleEnabled } from '@/modules/module-mgmt';

export function SystemAdminClientPage() {
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

### Step 5: Verify Left Nav Integration

**File to Check:** `templates/_project-stack-template/apps/web/app/components/ModuleAwareNavigation.tsx`

**Requirements:**
- Already uses `useModuleNavigation()` hook
- Verify nav items are filtered by `isEnabled`
- If not integrated, update navigation provider

### Step 6: Create Validation Script

**File:** `validation/module-toggle-validator/validator.py`

**Validates:**
- All core modules have `module_type = 'core'` in registry
- All functional modules have `module_type = 'functional'` in registry
- Admin cards check `useModuleEnabled()` for functional modules
- Core module admin cards are always visible (no conditional rendering)

### Step 7: Create Standard Documentation

**File:** `docs/standards/standard_MODULE-TOGGLE.md`

**Contents:**
- Core vs Functional module classification criteria
- Module-chat hybrid pattern explanation
- How to make a module toggleable
- Integration points: admin cards, navigation, WS plugin
- Testing checklist for module toggle functionality

---

## Success Criteria

- [x] **SC-1:** Module Configuration tab visible in `/admin/sys/mgmt` page
- [x] **SC-2:** Tab lists all registered modules with type indicators (core/functional)
- [x] **SC-3:** Core modules display "Always Enabled" badge, no toggle
- [x] **SC-4:** Functional modules have enable/disable toggle switch
- [x] **SC-5:** Toggling functional module updates `sys_module_registry.is_enabled`
- [ ] **SC-6:** Dependency validation prevents disabling if dependents are enabled (future)
- [x] **SC-7:** Admin cards (sys & org) are hidden/disabled for disabled modules
- [ ] **SC-8:** Left nav items hidden for disabled modules (hook exists, not integrated)
- [ ] **SC-9:** Validation script exists: `validation/module-toggle-validator/`
- [ ] **SC-10:** Standard documented: `docs/standards/standard_MODULE-TOGGLE.md`

---

## Deliverables

### Frontend Components

1. **`templates/_modules-core/module-mgmt/frontend/components/admin/ModuleConfigTab.tsx`**
   - Module configuration UI with toggle switches
   - Core vs Functional module separation
   - Module metadata display

2. **Updated `PlatformMgmtAdmin.tsx`**
   - Includes Modules tab

3. **Updated Admin Dashboard Pages**
   - `apps/web/app/admin/sys/SystemAdminClientPage.tsx`
   - `apps/web/app/admin/org/OrgAdminClientPage.tsx`
   - Both with module-aware card visibility

### Database Schema

4. **`templates/_modules-core/module-mgmt/db/schema/002-sys-module-registry.sql`**
   - module-chat reclassified as `module_type = 'functional'`

### Standards Documentation

5. **`docs/standards/standard_MODULE-TOGGLE.md`**
   - Module toggle pattern standard

### Validation

6. **`validation/module-toggle-validator/validator.py`**
   - Module toggle compliance validator

---

## Testing Checklist

### Unit Tests
- [ ] ModuleConfigTab renders core modules without toggles
- [ ] ModuleConfigTab renders functional modules with toggles
- [ ] Toggle switch calls `enableModule`/`disableModule` hooks
- [ ] Admin cards conditionally render based on module state

### Integration Tests
- [ ] Disable module-chat, verify admin card hidden
- [ ] Disable module-chat, verify nav item hidden
- [ ] Enable module-chat, verify admin card visible
- [ ] Enable module-chat, verify nav item visible

### Validation Tests
- [ ] Run module-toggle-validator on templates
- [ ] Verify all core modules marked as core in registry
- [ ] Verify all functional modules marked as functional in registry

---

## Dependencies

**Depends on:**
- Existing `useModuleRegistry` hook (already implemented)
- Existing `sys_module_registry` table (already exists)
- Existing `ModuleAwareNavigation` component (already exists)

**Blocks:**
- WS Plugin Architecture (needs module toggle infrastructure)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing module navigation | Test with all modules enabled first, then toggle off |
| Admin cards not respecting state | Validation script catches missing `useModuleEnabled` checks |
| DB schema ordering breaks | module-chat remains in core creation tier, only runtime type changes |

---

## Notes

- This sprint focuses on **infrastructure only** - making the toggle mechanism work
- Sprint 3b will handle admin page parity and documentation
- Sprint 3c (or separate) will handle in-app kbdocs

---

**Document Status:** ✅ Active  
**Last Updated:** January 25, 2026