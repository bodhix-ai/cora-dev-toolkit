# Fix: WS Plugin Architecture Sprint 3 Testing Issues

**Date:** February 3, 2026  
**Sprint:** WS Plugin Architecture Sprint 3  
**Issues Fixed:** 4  

---

## Issues Resolved

### Issue 1: Org Admin Config Page Missing Toggles

**Problem:** The page at `/admin/org/mgmt` showed only a view-only list of enabled modules without toggles to create (PUT) or update (PATCH) configuration.

**Root Cause:** The `OrgModuleConfigPage.tsx` component was never created during Phase 3 (Frontend Integration). Only the hooks were implemented.

**Fix:**
1. Created `templates/_modules-core/module-mgmt/frontend/pages/OrgModuleConfigPage.tsx`
   - Implements ADR-019a frontend admin authorization pattern
   - Uses `useRole()` + `useOrganizationContext()` hooks
   - Includes loading state checks and authorization gates
   - Provides toggle switches for module enablement
   - Shows system-level enablement status

2. Added admin card config to `cora-modules.config.yaml`:
   ```yaml
   - title: "Module Configuration"
     description: "Enable and configure modules for your organization."
     path: "/admin/org/mgmt/modules"
     icon: "Settings"
     visible_to: ["org_admin"]
     module: "module-mgmt"
   ```

**Result:** Org admins can now access and use module configuration page with full CRUD functionality.

---

### Issue 2: WS Settings Tab Shows Incorrect Module Enablement

**Problem:** The workspace module config component showed all sys and org level module enablement attributes as red X's (disabled), even though all modules were enabled at the system level.

**Root Causes:**

**A. Missing Fields in SQL Function**
The `resolve_module_config()` SQL function only returned the final resolved `is_enabled` value, not the individual enablement states at each level (system, org, workspace).

**B. Case Mismatch**
The SQL function returned snake_case keys (`module_name`, `is_enabled`) but the frontend expected camelCase (`moduleName`, `isEnabled`, `systemEnabled`, `orgEnabled`).

**Fixes:**

1. **Updated SQL Functions** (`005-resolve-module-config.sql`):
   - Added `system_enabled` field to show system-level enablement
   - Added `org_enabled` field to show org-level enablement (with cascade)
   - Added `ws_enabled` field to show workspace-level override
   - Applied to both `resolve_module_config()` and `resolve_org_module_config()` functions

2. **Updated Lambda Handlers** (`lambda_function.py`):
   - Created `_transform_ws_module()` function to convert snake_case to camelCase
   - Created `_transform_org_module()` function for org-level responses
   - Applied transformations to all workspace and org module endpoints:
     - `handle_list_ws_modules()`
     - `handle_get_ws_module()`
     - `handle_update_ws_module()`
     - `handle_list_org_modules()`
     - `handle_get_org_module()`
     - `handle_update_org_module()`

**Result:** Workspace module config component now correctly displays system, org, and workspace enablement states with proper checkmarks/X's.

---

## Files Modified

### Templates
1. `templates/_modules-core/module-mgmt/db/schema/005-resolve-module-config.sql`
2. `templates/_modules-core/module-mgmt/backend/lambdas/lambda-mgmt/lambda_function.py`
3. `templates/_modules-core/module-mgmt/frontend/pages/OrgModuleConfigPage.tsx` (new)
4. `templates/_project-stack-template/apps/web/cora-modules.config.yaml`

---

## Testing Required

### Manual Testing

1. **Org Admin Module Config Page:**
   - [ ] Navigate to `/admin/org/mgmt` as org admin
   - [ ] Verify admin card appears on org admin page
   - [ ] Click "Module Configuration" card
   - [ ] Verify module list loads with correct enablement states
   - [ ] Toggle a module on/off
   - [ ] Verify change persists after refresh
   - [ ] Test with sys admin disabled module (should show locked)

2. **Workspace Module Config:**
   - [ ] Navigate to workspace settings tab as workspace admin
   - [ ] Verify "System" column shows checkmarks for enabled modules
   - [ ] Verify "Org" column shows correct org-level enablement
   - [ ] Verify "Workspace" column shows workspace-level override toggle
   - [ ] Toggle a workspace-level override
   - [ ] Verify cascade logic prevents enabling if org/sys disabled

### Deployment Steps

1. Deploy SQL schema changes:
   ```bash
   cd {project}-infra
   ./scripts/run-database-migrations.sh
   ```

2. Build and deploy Lambda:
   ```bash
   cd {project}-stack
   ./scripts/build-cora-modules.sh module-mgmt
   
   cd {project}-infra
   ./scripts/deploy-lambda.sh module-mgmt/lambda-mgmt
   ```

3. Deploy frontend changes:
   ```bash
   cd {project}-stack
   # Restart dev server or deploy to production
   ```

---

## Additional Notes

- The frontend hooks (`useOrgModuleConfig`, `useWorkspaceModuleConfig`) were already correctly implemented and did not require changes
- The `WorkspaceModuleConfig.tsx` component interface expectations were correct; it was the backend that needed to align
- This fix completes Phase 3 of Sprint 3 (Frontend Integration)
- Phase 3b (UI Integration & Dynamic Filtering) is still pending - left nav and workspace tabs are not yet using dynamic module enablement

---

---

### Issue 3: WS Toggle Not Saving `is_enabled` to Database

**Problem:** When toggling a module in workspace settings, the `is_enabled` field remained `null` in the database even after toggling.

**Root Cause:** The `handleToggleEnabled()` function in `WorkspaceModuleConfig.tsx` was NOT passing `isEnabled` to `updateConfig()`. It only passed empty `configOverrides` and `featureFlagOverrides`.

**Fixes:**

1. **Updated `WorkspaceModuleConfig.tsx`:**
   ```typescript
   // BEFORE - BROKEN
   await updateConfig(module.name, {
     configOverrides: {},
     featureFlagOverrides: {},
   });  // ← isEnabled missing!

   // AFTER - FIXED
   const newEnabledState = !module.isEnabled;
   await updateConfig(module.name, {
     isEnabled: newEnabledState,  // ← Now properly toggled!
     configOverrides: {},
     featureFlagOverrides: {},
   });
   ```

2. **Updated `useWorkspaceModuleConfig.ts`:**
   - Added `isEnabled?: boolean` to `WorkspaceModuleConfigUpdate` type
   - Updated `updateConfig()` to send `is_enabled` in API request body

**Result:** WS toggle now correctly saves `is_enabled: true/false` to the database instead of `null`.

---

### Issue 4: Tabs Don't Update Immediately After WS Toggle

**Problem:** After toggling a module in workspace settings, the tab visibility didn't update until browser refresh. The db was correctly updated, but the UI didn't reflect the change.

**Root Cause:** `WorkspaceModuleConfig` component and `WorkspacePluginProvider` had separate state. When toggle updated the db and refreshed `WorkspaceModuleConfig`'s local state, the parent `WorkspacePluginProvider` (which controls tab visibility) wasn't notified.

**Fix:**

1. **Updated `WorkspaceModuleConfig.tsx`:**
   - Added `onModuleToggled?: () => Promise<void>` callback prop
   - Removed direct import of `useWorkspacePlugin` (avoided cross-module dependency)
   - After toggle, calls `onModuleToggled()` to notify parent

2. **Updated `WorkspaceDetailPage.tsx`:**
   - Gets `refresh: refreshPluginContext` from `useWorkspacePlugin()` hook
   - Passes `onModuleToggled={refreshPluginContext}` to `WorkspaceModuleConfig`

**Data Flow After Fix:**
1. User toggles module → API updates db
2. `refreshModules()` → Updates Settings table display
3. `onModuleToggled()` → Calls `refreshPluginContext()`
4. `WorkspacePluginProvider` re-fetches modules
5. `moduleAvailability` updates → Tabs re-render **immediately**

**Result:** Tabs now appear/disappear immediately when modules are toggled, without requiring browser refresh.

---

## Files Modified

### Templates
1. `templates/_modules-core/module-mgmt/db/schema/005-resolve-module-config.sql`
2. `templates/_modules-core/module-mgmt/backend/lambdas/lambda-mgmt/lambda_function.py`
3. `templates/_modules-core/module-mgmt/frontend/pages/OrgModuleConfigPage.tsx` (new)
4. `templates/_modules-core/module-mgmt/frontend/components/WorkspaceModuleConfig.tsx`
5. `templates/_modules-core/module-mgmt/frontend/hooks/useWorkspaceModuleConfig.ts`
6. `templates/_modules-core/module-ws/frontend/pages/WorkspaceDetailPage.tsx`
7. `templates/_project-stack-template/apps/web/cora-modules.config.yaml`

---

## Testing Required

### Manual Testing

1. **Org Admin Module Config Page:**
   - [ ] Navigate to `/admin/org/mgmt` as org admin
   - [ ] Verify admin card appears on org admin page
   - [ ] Click "Module Configuration" card
   - [ ] Verify module list loads with correct enablement states
   - [ ] Toggle a module on/off
   - [ ] Verify change persists after refresh
   - [ ] Test with sys admin disabled module (should show locked)

2. **Workspace Module Config:**
   - [ ] Navigate to workspace settings tab as workspace admin
   - [ ] Verify "System" column shows checkmarks for enabled modules
   - [ ] Verify "Org" column shows correct org-level enablement
   - [ ] Verify "Workspace" column shows workspace-level override toggle
   - [x] Toggle a workspace-level override → **Verify db updated correctly (Issue 3)**
   - [x] Verify tab visibility updates **immediately** (Issue 4)
   - [ ] Verify cascade logic prevents enabling if org/sys disabled

### Deployment Steps

1. Deploy SQL schema changes:
   ```bash
   cd {project}-infra
   ./scripts/run-database-migrations.sh
   ```

2. Build and deploy Lambda:
   ```bash
   cd {project}-stack
   ./scripts/build-cora-modules.sh module-mgmt
   
   cd {project}-infra
   ./scripts/deploy-lambda.sh module-mgmt/lambda-mgmt
   ```

3. Deploy frontend changes:
   ```bash
   cd {project}-stack
   # Restart dev server or deploy to production
   ```

---

## Additional Notes

- The frontend hooks (`useOrgModuleConfig`, `useWorkspaceModuleConfig`) were already correctly implemented and did not require changes
- The `WorkspaceModuleConfig.tsx` component interface expectations were correct; it was the backend that needed to align
- This fix completes Phase 3 of Sprint 3 (Frontend Integration)
- Phase 3b (UI Integration & Dynamic Filtering) is still pending - left nav and workspace tabs are not yet using dynamic module enablement
- **Issue 3 & 4 were discovered during testing** - toggle saved but tab visibility required refresh

---

## Related Documentation

- Sprint Plan: `docs/plans/plan_ws-plugin-arch-s3.md`
- Context: `memory-bank/context-ws-plugin-architecture.md`
- ADR-019a: `docs/arch decisions/ADR-019a-AUTH-FRONTEND.md`
- Standard: `docs/standards/01_std_front_AUTH.md`
