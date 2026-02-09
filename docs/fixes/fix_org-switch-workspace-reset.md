# Fix: Org Switch Does Not Reset Workspace Context

**Status:** 🔴 SECURITY ISSUE - Cross-Org Data Leakage  
**Priority:** P0 - Critical Security  
**Discovered:** February 9, 2026  
**Sprint:** S5 (Eval Optimization Testing)  
**Module:** module-access (App Shell / Org Selector)  

---

## Problem

When a user switches organizations via the org selector, the application does **not** reset the workspace context. This causes:

1. **Workspaces from the previous org remain visible** in the sidebar/workspace list
2. **User can interact with resources from the wrong org** (evaluations, doc types, etc.)
3. **Backend returns 404 errors** because resource org_id doesn't match the new org context
4. **Security violation:** User sees cross-org data they shouldn't have access to

## Reproduction Steps

1. Log in and select Org A
2. Navigate to a workspace in Org A
3. Switch to Org B via the org selector
4. **BUG:** The workspace from Org A is still displayed
5. Attempting to create an evaluation uses doc types from Org A (wrong org)
6. Backend returns "Document type not found" (404) because doc type's org_id ≠ Org B's id

## Root Cause

The org selector component changes the org context but does **not** trigger:
- Workspace list refresh (still shows Org A's workspaces)
- Selected workspace clear (still has Org A's workspace selected)
- Module data cache clear (doc types, criteria sets, etc. from Org A still cached)

## Impact

- **Security:** Cross-org data leakage (user sees workspaces/resources from wrong org)
- **Data integrity:** Operations could potentially modify resources in wrong org context
- **UX:** Confusing 404 errors when interacting with stale cross-org data

## Fix Requirements

### 1. Org Selector Must Clear State on Change

When org changes, the app shell must:
- [ ] Clear selected workspace
- [ ] Clear workspace list
- [ ] Navigate user to workspace list page (or org home)
- [ ] Clear all module-specific cached data (eval doc types, criteria sets, etc.)

### 2. Implementation Location

**Primary:** App shell org selector component
- `templates/_project-stack-template/app/components/OrgSelector.tsx` (or equivalent)
- On org change callback: dispatch state clear actions

**Secondary:** Module stores (Zustand/Redux)
- Each module store should have a `resetOnOrgChange()` action
- App shell calls all registered module reset actions on org switch

### 3. Backend Guard (Defense in Depth)

The backend already validates org_id on resource access (the 404 error proves this). No backend changes needed — the backend correctly rejects cross-org access.

## Suggested Fix Pattern

```typescript
// In OrgSelector or wherever org switch happens:
const handleOrgChange = async (newOrgId: string) => {
  // 1. Clear all module caches
  evalStore.getState().reset();
  kbStore.getState().reset();
  wsStore.getState().reset();
  // ... other module stores
  
  // 2. Clear workspace selection
  setSelectedWorkspace(null);
  
  // 3. Update org context
  setCurrentOrg(newOrgId);
  
  // 4. Navigate to safe page (workspace list or org home)
  router.push('/ws');
  
  // 5. Reload workspace list for new org
  loadWorkspaces(newOrgId);
};
```

## Files to Investigate

- `templates/_project-stack-template/app/components/` - Org selector
- `templates/_modules-core/module-access/frontend/` - Auth/org context hooks
- `templates/_modules-core/module-ws/frontend/` - Workspace state management
- `templates/_modules-functional/module-eval/frontend/hooks/` - Eval module stores

## Priority

This should be fixed **before any production deployment**. For testing purposes, the workaround is to refresh the browser after switching orgs, or navigate to the workspace list and select a workspace belonging to the current org.

---

**Workaround:** After switching orgs, refresh the browser (Ctrl+R) to clear stale state.