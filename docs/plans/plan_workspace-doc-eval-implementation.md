# Workspace Document Evaluation Tab - Implementation Plan (Incremental Approach)

**Status**: � IN PROGRESS  
**Priority**: HIGH  
**Estimated Duration**: 2-3 hours  
**Created**: January 19, 2026  
**Updated**: January 19, 2026 - Switched to incremental approach  
**Branch**: `admin-eval-config-s2`  
**Commits**: `135f0ba` (hook fixes), `76d5aa9` (plan document)

---

## Executive Summary

This document outlines the **AGREED-UPON INCREMENTAL APPROACH** for adding document evaluation functionality to workspace detail pages. This approach prioritizes safety and testing at each step to avoid the infinite loop issues encountered in previous attempts.

**Key Decision:** Use **direct integration** into WorkspaceDetailPage with **incremental hook addition**, testing after each phase to catch issues early.

---

## Implementation Approach (CURRENT)

### Phase A: Overview Tab (Safe - No New Hooks) ✅ COMPLETE

**Goal:** Replace mock data in first tab with static overview content. **Zero new hooks.**

**Status:** ✅ Tested and confirmed working by user

**Changes to `WorkspaceDetailPage.tsx`:**
1. Rename first tab from "Activities" to "Overview"
2. Remove all mock workflow/chat data
3. Show static workspace info:
   - Creation date
   - Description
   - Member count (already available from existing hooks)
   - Basic stats

**Test:** ✅ Verified - workspace page loads, Overview tab displays correctly, all tabs accessible

**Duration:** ~15 minutes

**Result:** User confirmed Phase A working correctly. No infinite loops, all functionality intact.

---

### Phase B: Doc Eval Tab (Minimal Hooks) ✅ COMPLETE

**Goal:** Add Doc Eval tab with **only** `useEvaluations` hook. **NO create button yet.**

**Changes to `WorkspaceDetailPage.tsx`:**
1. ✅ Add "Doc Eval" as second tab (after Overview)
2. ✅ Import `useEvaluations` and `useEvaluationStats` from module-eval
3. ✅ Display evaluation cards:
   - Status badges (pending/processing/completed/failed)
   - Progress bars for processing evaluations
   - Compliance scores for completed evaluations
   - Click card → Navigate to detail page
4. ✅ Stats chips (from `useEvaluationStats`)
5. ✅ Empty state message (no create button)

**Test:** Verify:
- Workspace page still loads
- Tab navigation works
- Evaluations list displays (or empty state)
- **No infinite loops**

**Status:** ✅ Code complete, synced to test project, ready for user testing

**Duration:** ~30 minutes

---

### Phase C: Doc Eval Tab - Full Integration

**Goal:** Add remaining hooks and create button.

**Changes to `WorkspaceDetailPage.tsx`:**
1. Import `useEvalDocTypes`, `useEvalCriteriaSets` hooks
2. Import `CreateEvaluationDialog` component
3. Add "Evaluate Document" button
4. Integrate create dialog with handlers
5. Add progress polling for processing evaluations

**Test:** Full Doc Eval tab functionality.

**Duration:** ~30 minutes

---

### Phase D: Evaluation Detail Route

**Goal:** Wire up route to display EvalDetailPage.

**New File:** `templates/_modules-functional/module-ws/routes/ws/[id]/eval/[evalId]/page.tsx`

```tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { EvalDetailPage } from "@{{PROJECT_NAME}}/module-eval";

export default function WorkspaceEvalDetailRoute() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useOrganizationContext();
  
  return (
    <EvalDetailPage
      evaluationId={params.evalId as string}
      workspaceId={params.id as string}
      onBack={() => router.push(`/ws/${params.id}`)}
    />
  );
}
```

**Test:** Navigate to `/ws/[id]/eval/[evalId]` displays evaluation details.

**Duration:** ~15 minutes

---

### Phase E: End-to-End Testing

**Test Scenarios:**

1. **Overview Tab:**
   - Displays workspace creation date
   - Shows description
   - Shows member count

2. **Doc Eval Tab:**
   - Create evaluation with KB document
   - Create evaluation with new upload
   - View evaluation cards
   - Click card → Navigate to detail page
   - Watch status update (pending → processing → completed)

3. **Evaluation Detail Page:**
   - View criteria results
   - Edit a result (human editing)
   - Download report (PDF/XLSX)

4. **Performance:**
   - No infinite loops
   - Page loads in < 2 seconds

**Duration:** ~30 minutes

---

## Tab Structure After Implementation

```
┌─────────────────────────────────────────────────────┐
│  Workspace: CJIS Audit 2026                         │
├─────────────────────────────────────────────────────┤
│  [Overview] [Doc Eval] [Data] [Members] [Settings]  │
└─────────────────────────────────────────────────────┘

Overview Tab (Phase A):
- Creation date
- Description
- Quick stats (X evaluations, Y documents, Z members)

Doc Eval Tab (Phase B → Phase C):
Phase B: Evaluation cards list (no create button)
Phase C: + "Evaluate Document" button → CreateEvaluationDialog

Data Tab: (existing KB functionality - unchanged)

Members Tab: (existing - unchanged)

Settings Tab: (existing - unchanged)
```

---

## Risk Mitigation

**Potential Issue:** Infinite loops (as encountered before)

**Mitigation Strategy:**
1. ✅ **Hook fixes committed** (135f0ba) - Removed unstable dependencies from useEffect
2. ✅ **Failed attempts discarded** - Clean baseline established
3. **Incremental addition:** Phase B adds only `useEvaluations`, Phase C adds remaining hooks
4. **Test after each phase:** Catch issues immediately
5. **Rollback ready:** Can revert to clean baseline at any point

---

## Success Criteria

### Definition of Done

- [ ] Phase A: Overview tab created (no hooks, no errors)
- [ ] Phase B: Doc Eval tab with evaluation cards (useEvaluations only, no errors)
- [ ] Phase C: Create button and dialog integrated (all hooks, no errors)
- [ ] Phase D: Evaluation detail route working
- [ ] Phase E: End-to-end testing passed
- [ ] No infinite loop errors in console
- [ ] Workspace page loads in < 2 seconds
- [ ] Template updated and synced to test project

---

## Rollback Plan

If infinite loops occur at any phase:

1. **Identify the problematic phase:**
   - Phase A: Revert to commit `76d5aa9`
   - Phase B: Discard WorkspaceDetailPage changes, keep Phase A
   - Phase C: Discard Phase C changes, keep Phase A + B

2. **Execute rollback:**
   ```bash
   git restore templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx
   ```

3. **Sync to test project and clear cache:**
   ```bash
   ./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-eval/ai-sec-stack "module-ws/frontend/pages/WorkspaceDetailPage.tsx"
   cd ~/code/bodhix/testing/test-eval/ai-sec-stack && rm -rf .next
   ```

---

## Baseline Established (Phase 0)

**Commits Made:**
1. **135f0ba** - `fix(hooks): Remove unstable dependencies from useEffect to prevent infinite loops`
   - Fixed 8 files (KB, eval, workspace hooks)
   - Prevents infinite re-render loops by ensuring stable dependencies
   
2. **76d5aa9** - `docs: Add workspace document evaluation implementation plan`
   - Added comprehensive implementation plan document

**Changes Discarded:**
- WorkspaceDetailPage.tsx (failed integration with 610 lines changed)
- index.ts exports
- WorkspaceDetailPageV2.tsx (deleted)
- WorkspaceDetailPageV3.tsx (deleted)

**Current State:**
- ✅ Clean working directory
- ✅ No uncommitted changes
- ✅ All hook dependency issues fixed
- ✅ Ready to start fresh, incremental implementation

---

## Previous Approach (SUPERSEDED)

> **Note:** The original plan recommended a separate route architecture to avoid hook conflicts. After reviewing the hooks and confirming dependency fixes were in place, we decided on an incremental direct integration approach instead. The separate route approach is documented below for reference but is **NOT** the current plan.

<details>
<summary>Click to view superseded separate route approach</summary>

### What Happened in Previous Session

**Timeline of Events:**

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
   - Fixed hook dependencies (commit `135f0ba`)

### Why Separate Route Was Considered

The infinite loops were caused by:

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

### Separate Route Architecture (Not Used)

**Route Structure:**
```
/ws/[workspaceId]              → WorkspaceDetailPage (Activities, Data, Members, Settings)
/ws/[workspaceId]/eval         → WorkspaceEvalListPage (List of evaluations)
/ws/[workspaceId]/eval/[evalId] → EvalDetailPage (Individual evaluation results)
```

**Benefits of Separate Route:**
- ✅ Complete hook isolation
- ✅ Easier to debug
- ✅ Better performance
- ✅ Cleaner code

**Why We Chose Direct Integration Instead:**
- Hook dependency fixes (commit `135f0ba`) resolved the root cause
- Incremental addition provides safety without extra navigation
- Better UX with integrated tabs

</details>

---

## Technical Details

### Hook Dependency Best Practices

The hooks were fixed to follow these patterns:

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

## References

**Related Documentation:**
- `docs/specifications/module-eval/WORKSPACE-DOCUMENT-EVALUATION.md` - User experience spec
- `docs/plans/plan_admin-eval-config-s2.md` - Sprint plan that encountered issues
- `templates/_modules-functional/module-ws/frontend/pages/WorkspaceDetailPage.tsx` - Current working version
- `templates/_modules-functional/module-eval/frontend/pages/EvalDetailPage.tsx` - Evaluation detail page (complete)
- `templates/_modules-functional/module-ws/frontend/components/CreateEvaluationDialog.tsx` - Create dialog (complete)

**Module Dependencies:**
- module-ws (workspace management)
- module-eval (evaluation functionality)
- module-kb (knowledge base for documents)
- module-access (authentication context)

**Test Project:**
- Location: `~/code/bodhix/testing/test-eval/`
- Stack: `~/code/bodhix/testing/test-eval/ai-sec-stack`
- Infra: `~/code/bodhix/testing/test-eval/ai-sec-infra`

---

**Document Status:** ✅ Phase B Complete, Ready for User Testing  
**Last Updated:** January 19, 2026  
**Current Phase:** Phase B Complete - User Testing Required  
**Branch:** admin-eval-config-s2  
**Session Progress:** Phase A & D committed, Phase B code complete and synced
