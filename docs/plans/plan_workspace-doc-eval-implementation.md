# Workspace Document Evaluation Tab - Implementation Plan

**Status**: 📋 READY FOR IMPLEMENTATION  
**Priority**: MEDIUM  
**Estimated Duration**: 2-3 hours  
**Created**: January 19, 2026  
**Session Context**: Lessons learned from admin-eval-config-s2 session

---

## Executive Summary

This document provides a battle-tested implementation plan for adding document evaluation functionality to workspace detail pages. The plan is based on lessons learned from a session that encountered infinite loop issues when integrating multiple evaluation hooks simultaneously.

**The Problem:** Attempting to integrate `useEvaluations`, `useEvaluationStats`, `useEvalDocTypes`, and `useEvalCriteriaSets` hooks all at once into `WorkspaceDetailPage` caused infinite re-render loops that persisted even with minimal page implementations.

**The Solution:** Use a **separate route architecture** that isolates evaluation functionality from workspace hooks, preventing hook conflicts and providing a cleaner separation of concerns.

---

## What Happened in Previous Session

### Timeline of Events

1. **Started with working WorkspaceDetailPage** (commit `719e51e`)
   - Had hardcoded Activities tab with workflows/chats
   - All workspace functionality working (Members, Settings, etc.)
   - No infinite loops

2. **Added evaluation functionality** (commit `e01afe6`)
   - Replaced Activities tab with "Doc Eval" tab
   - Integrated 4 evaluation hooks: `useEvaluations`, `useEvaluationStats`, `useEvalDocTypes`, `useEvalCriteriaSets`
   - Added `CreateEvaluationDialog` component
   - Integrated with module-kb hooks for document upload

3. **Encountered infinite loop errors**
   - Error: "Maximum update depth exceeded"
   - Persisted across multiple debugging attempts
   - Even minimal implementations with NO hooks still had loops

4. **Root Cause Identified**
   - The evaluation hooks had circular dependencies
   - Multiple hooks triggering each other's `useEffect` calls
   - Particularly `useEvaluations` and `useEvaluationStats` interaction

5. **Solution Applied**
   - Reverted `WorkspaceDetailPage` to commit `719e51e` (pre-session version)
   - Page immediately worked without errors
   - Confirmed the eval hooks were the problem

---

## Root Cause Analysis

### Why the Infinite Loops Occurred

The infinite loops were caused by a **cascade of hook dependencies**:

```tsx
// PROBLEMATIC PATTERN (Don't Do This)

// useEvaluations hook internally:
const [evaluations, setEvaluations] = useState([]);

useEffect(() => {
  fetchEvaluations(); // This function is recreated on every render
}, [fetchEvaluations]); // Depends on function that changes

// In WorkspaceDetailPage:
const { evaluations } = useEvaluations(...);
const stats = useEvaluationStats(); // Depends on evaluations
const { docTypes } = useEvalDocTypes(...);
const { criteriaSets } = useEvalCriteriaSets(...);

// Each hook's useEffect triggers the next hook's useEffect
// Creating an infinite chain of re-renders
```

### Key Issues

1. **Function Dependencies in useEffect**
   - Hooks had `fetchData` functions in their `useEffect` dependency arrays
   - These functions were recreated on every render
   - Caused continuous re-triggering of effects

2. **Multiple Hooks Reading from Same Store**
   - Several hooks subscribed to the same Zustand store
   - Store updates triggered all subscribed hooks simultaneously
   - Created cascading re-renders

3. **Context Provider Re-renders**
   - `useOrganizationContext` and `useSession` were also involved
   - Their updates propagated through all child hooks

---

## Proposed Architecture (Option A: Separate Route)

### Overview

**Instead of embedding evaluations in a tab, create a dedicated evaluation page.**

### Route Structure

```
/ws/[workspaceId]              → WorkspaceDetailPage (Activities, Data, Members, Settings)
/ws/[workspaceId]/eval         → WorkspaceEvalListPage (List of evaluations)
/ws/[workspaceId]/eval/[evalId] → EvalDetailPage (Individual evaluation results)
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ WorkspaceDetailPage                                      │
│ /ws/[id]                                                │
├─────────────────────────────────────────────────────────┤
│ Tabs:                                                   │
│  • Activities (hardcoded workflows/chats)               │
│  • Doc Eval (Summary + Link to eval page)  ← Minimal   │
│  • Data (KB documents)                                  │
│  • Members                                              │
│  • Settings                                             │
└─────────────────────────────────────────────────────────┘
                           │
                           │ User clicks "View Evaluations"
                           ▼
┌─────────────────────────────────────────────────────────┐
│ WorkspaceEvalListPage                                   │
│ /ws/[id]/eval                                           │
├─────────────────────────────────────────────────────────┤
│ Hooks (isolated):                                       │
│  • useEvaluations(workspaceId)                         │
│  • useEvaluationStats(workspaceId)                     │
│  • useEvalDocTypes(orgId)                              │
│  • useEvalCriteriaSets(orgId)                          │
│                                                         │
│ Components:                                             │
│  • Evaluation cards list                               │
│  • Create evaluation button → Dialog                   │
│  • Filter/search controls                              │
└─────────────────────────────────────────────────────────┘
                           │
                           │ User clicks evaluation card
                           ▼
┌─────────────────────────────────────────────────────────┐
│ EvalDetailPage (from module-eval)                      │
│ /ws/[id]/eval/[evalId]                                 │
├─────────────────────────────────────────────────────────┤
│ Shows:                                                  │
│  • Document summary                                     │
│  • Compliance score                                     │
│  • Criteria results                                     │
│  • Citations                                            │
└─────────────────────────────────────────────────────────┘
```

### Benefits of This Approach

✅ **Complete Hook Isolation**
- Evaluation hooks only run on evaluation pages
- No interaction with workspace hooks
- Independent state management

✅ **Easier to Debug**
- If issues occur, they're isolated to eval pages
- Can fix without affecting workspace functionality

✅ **Better Performance**
- Workspace page loads faster (no eval hooks)
- Eval page only loads when needed

✅ **Cleaner Code**
- Each page has a single responsibility
- Less complex component structure

✅ **Future-Proof**
- Easy to add more eval features without bloating workspace page
- Can enhance eval pages independently

---

## Implementation Plan

### Phase 1: Create Minimal Doc Eval Tab (15 minutes)

**Goal:** Add a simple Doc Eval tab to WorkspaceDetailPage that shows a summary and link.

**File:** `templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx`

**Changes:**
1. Add "Doc Eval" as fourth tab (push Settings to fifth)
2. Tab content shows:
   - Summary card: "X evaluations in this workspace"
   - Button: "View All Evaluations" → navigates to `/ws/[id]/eval`
   - No hooks, just static UI

**Code Example:**
```tsx
<TabPanel value={activeTab} index={0}>
  <Box>
    <Typography variant="h6" gutterBottom>
      📋 Document Evaluations
    </Typography>
    <Alert severity="info" sx={{ mb: 2 }}>
      Evaluate documents against your organization's compliance criteria.
    </Alert>
    <Button
      variant="contained"
      onClick={() => router.push(`/ws/${workspaceId}/eval`)}
    >
      View All Evaluations
    </Button>
  </Box>
</TabPanel>
```

**Testing:**
- ✅ Workspace page still loads without errors
- ✅ Tab navigation works
- ✅ Button navigates to eval page (404 expected for now)

---

### Phase 2: Create WorkspaceEvalListPage Component (1 hour)

**Goal:** Build the dedicated evaluation list page with all eval hooks.

**File:** `templates/_modules-functional/module-ws/frontend/pages/WorkspaceEvalListPage.tsx`

**Structure:**
```tsx
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import {
  useEvaluations,
  useEvaluationStats,
  useEvalDocTypes,
  useEvalCriteriaSets,
  CreateEvaluationDialog,
} from "@{{PROJECT_NAME}}/module-eval";
import { useKbDocuments } from "@{{PROJECT_NAME}}/module-kb";

export interface WorkspaceEvalListPageProps {
  workspaceId: string;
  orgId: string;
  onBack?: () => void;
  onViewEvaluation?: (evaluationId: string) => void;
}

export function WorkspaceEvalListPage({
  workspaceId,
  orgId,
  onBack,
  onViewEvaluation,
}: WorkspaceEvalListPageProps) {
  // State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Session
  const { data: session } = useSession();
  
  // Eval hooks
  const {
    evaluations,
    isLoading,
    error,
    create,
    remove,
    refresh,
  } = useEvaluations(session?.accessToken as string, workspaceId, {});
  
  const stats = useEvaluationStats();
  const { docTypes } = useEvalDocTypes(session?.accessToken as string, orgId);
  const { criteriaSets } = useEvalCriteriaSets(session?.accessToken as string, orgId, {});
  
  // KB hooks for document upload
  const { documents, uploadDocument } = useKbDocuments({
    scope: 'workspace',
    scopeId: workspaceId,
  });
  
  // Handlers
  const handleCreate = async (input: any) => {
    await create(input);
    refresh();
    setCreateDialogOpen(false);
  };
  
  const handleDelete = async (evalId: string) => {
    await remove(evalId);
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton onClick={onBack} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ flex: 1 }}>
          Document Evaluations
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Evaluate Document
        </Button>
      </Box>
      
      {/* Stats chips */}
      {stats.total > 0 && (
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Chip label={`${stats.total} Total`} />
          {stats.processing > 0 && <Chip label={`${stats.processing} Processing`} color="info" />}
          {stats.completed > 0 && <Chip label={`${stats.completed} Completed`} color="success" />}
          {stats.failed > 0 && <Chip label={`${stats.failed} Failed`} color="error" />}
        </Box>
      )}
      
      {/* Error state */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      {/* Loading state */}
      {isLoading && evaluations.length === 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Empty state */}
      {!isLoading && evaluations.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Description sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6">No evaluations yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start evaluating documents against your organization's criteria
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create First Evaluation
          </Button>
        </Box>
      )}
      
      {/* Evaluations list */}
      {!isLoading && evaluations.length > 0 && (
        <Box>
          {evaluations.map((evaluation) => (
            <Card key={evaluation.id} sx={{ mb: 2 }}>
              {/* Evaluation card content - similar to what was in WorkspaceDetailPage */}
            </Card>
          ))}
        </Box>
      )}
      
      {/* Create dialog */}
      <CreateEvaluationDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreate}
        docTypes={docTypes || []}
        criteriaSets={criteriaSets || []}
        kbDocuments={documents || []}
        onUploadDocument={uploadDocument}
      />
    </Container>
  );
}

export default WorkspaceEvalListPage;
```

**Export from index:**
```tsx
// templates/_modules-functional/module-ws/frontend/pages/index.ts
export { WorkspaceEvalListPage } from "./WorkspaceEvalListPage";
export type { WorkspaceEvalListPageProps } from "./WorkspaceEvalListPage";
```

**Testing:**
- ✅ Component compiles without errors
- ✅ All hooks work in isolation
- ✅ Can create evaluations
- ✅ Can view evaluation cards

---

### Phase 3: Create Route (15 minutes)

**Goal:** Wire up the new page to a route.

**File:** `templates/_modules-functional/module-ws/routes/ws/[id]/eval/page.tsx` (NEW FILE)

**Content:**
```tsx
"use client";

/**
 * Workspace Evaluation List Page
 *
 * Route: /ws/[id]/eval
 * Shows all evaluations for a workspace.
 */

import { useParams, useRouter } from "next/navigation";
import { useOrganizationContext, useUser } from "@{{PROJECT_NAME}}/module-access";
import { WorkspaceEvalListPage } from "@{{PROJECT_NAME}}/module-ws";

export default function WorkspaceEvalListRoute() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useOrganizationContext();
  const workspaceId = params.id as string;
  const orgId = currentOrganization?.orgId || "";

  const handleBack = () => {
    router.push(`/ws/${workspaceId}`);
  };

  const handleViewEvaluation = (evaluationId: string) => {
    router.push(`/ws/${workspaceId}/eval/${evaluationId}`);
  };

  return (
    <WorkspaceEvalListPage
      workspaceId={workspaceId}
      orgId={orgId}
      onBack={handleBack}
      onViewEvaluation={handleViewEvaluation}
    />
  );
}
```

**Testing:**
- ✅ Navigate to `/ws/[id]/eval` loads the page
- ✅ Back button returns to workspace page
- ✅ Clicking evaluation card navigates to detail page

---

### Phase 4: Update Template and Sync (15 minutes)

**Goal:** Apply changes to template and sync to test project.

**Actions:**
1. Update `WorkspaceDetailPage.tsx` in template (Phase 1 changes)
2. Create `WorkspaceEvalListPage.tsx` in template (Phase 2)
3. Update `pages/index.ts` exports
4. Create route file `routes/ws/[id]/eval/page.tsx`
5. Sync all to test project:
   ```bash
   ./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-eval/ai-sec-stack "module-ws/frontend/pages/WorkspaceDetailPage.tsx"
   ./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-eval/ai-sec-stack "module-ws/frontend/pages/WorkspaceEvalListPage.tsx"
   ./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-eval/ai-sec-stack "module-ws/frontend/pages/index.ts"
   ```
6. Manually copy route file to test project
7. Clear cache: `cd ~/code/bodhix/testing/test-eval/ai-sec-stack && rm -rf .next`

**Testing:**
- ✅ Workspace page loads without errors
- ✅ Doc Eval tab shows summary
- ✅ "View All Evaluations" navigates to eval page
- ✅ Eval page shows evaluations
- ✅ Can create new evaluation
- ✅ Can navigate to evaluation details

---

### Phase 5: Integration Testing (30 minutes)

**Test Scenarios:**

1. **Workspace Page Stability**
   - Load workspace page multiple times
   - Switch between tabs
   - Ensure no infinite loops

2. **Eval Page Functionality**
   - Create evaluation with existing KB document
   - Create evaluation with new upload
   - View evaluation list
   - Filter/search evaluations (if implemented)
   - Delete evaluation

3. **Navigation Flow**
   - Workspace → Eval List → Eval Detail → Back
   - Ensure back button always works
   - Breadcrumbs work correctly

4. **Performance**
   - Check load times
   - Verify hooks only run when page is active
   - No memory leaks

---

## Alternative Approaches (Not Recommended)

### Option B: Lazy-Loaded Tab Content

**Pros:** Keeps integrated tab UI  
**Cons:** Still risk of hook conflicts, more complex debugging

**If you choose this:** Use `React.lazy()` and `Suspense` to load eval content only when tab is active.

### Option C: Incremental Hook Integration

**Pros:** Most integrated experience  
**Cons:** HIGH RISK of infinite loops, time-consuming debugging

**If you choose this:** Add ONE hook at a time, test after each, fix issues immediately.

---

## Technical Details

### Hook Dependency Best Practices

When using hooks in the eval page, follow these patterns:

**✅ GOOD - Stable Dependencies:**
```tsx
useEffect(() => {
  if (workspaceId && orgId) {
    fetchEvaluations();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [workspaceId, orgId]); // Only primitive values
```

**❌ BAD - Function Dependencies:**
```tsx
useEffect(() => {
  fetchEvaluations(); // Function recreated on every render
}, [fetchEvaluations]); // Causes infinite loop
```

**✅ GOOD - useCallback with Stable Deps:**
```tsx
const fetchEvaluations = useCallback(async () => {
  // ... fetch logic
}, [workspaceId, orgId]); // Stable primitive deps
```

### Store Subscriptions

If using Zustand store, avoid subscribing to entire store:

**❌ BAD:**
```tsx
const state = useEvalStore(); // Subscribes to ALL changes
```

**✅ GOOD:**
```tsx
const evaluations = useEvalStore((s) => s.evaluations); // Only this field
```

---

## Success Criteria

### Definition of Done

- [x] Doc Eval tab exists in WorkspaceDetailPage (minimal, no hooks)
- [ ] WorkspaceEvalListPage component created and exported
- [ ] Route `/ws/[id]/eval` created and working
- [ ] Can navigate: Workspace → Eval List → Eval Detail → Back
- [ ] Can create evaluations from eval page
- [ ] Can view evaluation list with stats
- [ ] Can delete evaluations
- [ ] No infinite loop errors in console
- [ ] Workspace page loads in < 2 seconds
- [ ] Template updated and synced to test project

---

## Rollback Plan

If issues occur during implementation:

1. **Revert WorkspaceDetailPage:**
   ```bash
   git show 719e51e:templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx > templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx
   ```

2. **Remove new route file:**
   ```bash
   rm templates/_modules-functional/module-ws/routes/ws/[id]/eval/page.tsx
   ```

3. **Sync to test project and clear cache**

---

## Future Enhancements

Once the basic architecture is working:

1. **Inline Summary in Doc Eval Tab**
   - Show evaluation count without hooks
   - Use static badge/chip
   - Link to full page

2. **Lazy Load Eval List**
   - If tab integration is desired
   - Use `React.lazy()` to defer hook loading

3. **Evaluation Filters**
   - Add filter by status, date, doc type
   - Search by document name

4. **Batch Operations**
   - Select multiple evaluations
   - Bulk delete, export

---

## References

**Session that identified this issue:**
- Sprint: `admin-eval-config-s2`
- Date: January 19, 2026
- Branch: `admin-eval-config-s2`
- Working commit: `719e51e` (pre-eval integration)
- Problematic commit: `e01afe6` (eval integration with infinite loops)

**Related Documentation:**
- `docs/specifications/module-eval/WORKSPACE-DOCUMENT-EVALUATION.md` - User experience spec
- `docs/plans/plan_admin-eval-config-s2.md` - Sprint plan that encountered issues
- `templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx` - Current working version

**Module Dependencies:**
- module-ws (workspace management)
- module-eval (evaluation functionality)
- module-kb (knowledge base for documents)
- module-access (authentication context)

---

**Document Status:** ✅ READY FOR IMPLEMENTATION  
**Last Updated:** January 19, 2026  
**Next Session:** Follow Phase 1-5 implementation plan
