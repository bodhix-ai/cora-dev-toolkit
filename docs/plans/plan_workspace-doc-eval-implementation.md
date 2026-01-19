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

**Status:** ✅ Complete and tested

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

**Test:** ✅ Verified - workspace page loads, evaluations display correctly

---

### Phase C: Doc Eval Tab - Full Integration ✅ COMPLETE

**Status:** ✅ Complete with draft-first approach (dialog-less)

**Changes to `WorkspaceDetailPage.tsx`:**
1. ✅ Add "Evaluate Document" button
2. ✅ Create draft evaluation on click (no dialog)
3. ✅ Navigate to detail page for configuration
4. ✅ Loading states and error handling
5. ✅ Console debug logging

**Test:** ✅ Verified - evaluation creation and navigation work

**Note:** Used draft-first approach instead of dialog to avoid hook complexity

---

### Phase D: Evaluation Detail Route ✅ COMPLETE

**Status:** ✅ Complete and working

**Files Created/Updated:**
1. ✅ `eval/[id]/page.tsx` - Route component
2. ✅ `eval/layout.tsx` - SessionProvider wrapper
3. ✅ `EvalDetailPage.tsx` - Accepts token prop
4. ✅ Fixed all prop mismatches

**Test:** ✅ Verified - route loads, evaluation displays

**Fixes Applied:**
- Added SessionProvider context via layout
- Fixed token parameter passing
- Fixed EvalExportButton props
- Fixed null safety in EvalSummaryPanel

**New File Created:** `templates/_modules-functional/module-ws/routes/ws/[id]/eval/[evalId]/page.tsx`

**What Was Done:**
1. ✅ Created route file with 475 lines of code
2. ✅ File placed at correct location: `app/(workspace)/ws/[id]/eval/[evalId]/page.tsx`
3. ✅ Placeholders replaced correctly (`@ai-sec/module-access`, etc.)
4. ✅ Updated `sync-fix-to-project.sh` to handle route groups `(workspace)`
5. ✅ Cache cleared, dev server restarted multiple times

**The Mystery - Still Returns 404:**
- Next.js compiles `/ws/[id]` successfully
- But does NOT compile `/ws/[id]/eval/[evalId]` (no compilation attempt)
- File exists with correct content at correct location
- User can access `/ws/{id}` workspace detail pages
- But there's **NO page.tsx at `app/(workspace)/ws/[id]/page.tsx`**
- Only page under `ws/[id]` is our eval route

**Investigation Needed for Next Session:**

1. **Find Where Workspace Detail Route is Defined**
   - User CAN access `/ws/{id}` but no page.tsx exists for it
   - Must be using alternative routing pattern (layout? catch-all?)
   - WorkspaceDetailPage component exists in `packages/module-ws/frontend/pages/`
   - Need to find where it's imported and used as a route

2. **Understand Why Next.js Ignores Nested Route**
   - File is correct, cache cleared, but Next.js doesn't see it
   - Possible compilation errors preventing route recognition?
   - Possible CORA-specific routing conventions?

3. **Check Module-Eval TypeScript Errors**
   - User mentioned module-eval has many TypeScript errors
   - These might be preventing the eval route from compiling
   - Need to address these errors (separate branch is handling validation errors)

4. **Tools Updated for Next Session:**
   - ✅ `sync-fix-to-project.sh` now detects `(workspace)` route groups
   - ✅ Automatically maps routes to correct location
   - ✅ Handles placeholder replacement

**Alternative Approach to Consider:**
If routing architecture issues persist, consider integrating eval detail view as a modal or expanded card within the Doc Eval tab instead of a separate route. This avoids nested routing complexity entirely.

**Test:** Navigate to `/ws/[id]/eval/[evalId]` - should display evaluation details (currently 404)

**Duration:** Investigation TBD (routing architecture discovery + fixes)

---

### Phase E: SessionProvider Context ✅ COMPLETE

**Status:** ✅ Complete - Fixed useSession error

**Issue:** Route component calling `useSession()` outside SessionProvider context

**Solution:**
1. ✅ Created `eval/layout.tsx` to wrap all `/eval` routes with SessionProvider
2. ✅ Route file (`eval/[id]/page.tsx`) now calls `useSession()` within provider context
3. ✅ Passes token as prop to EvalDetailPage component

**Test:** ✅ Verified - No SessionProvider errors

---

### Phase F: EvalExportButton Props ✅ COMPLETE

**Status:** ✅ Complete - Fixed prop mismatches

**Issue:** EvalExportButton expected different props than what Header was passing

**Solution:**
1. ✅ Updated Header component to pass `evaluation` object
2. ✅ Combined `handleExportPdf` and `handleExportXlsx` into single `handleExport` callback
3. ✅ Fixed all Header component calls to use new props

**Test:** ✅ Verified - Export button renders without errors

---

### Phase G: Null Safety ✅ COMPLETE

**Status:** ✅ Complete - Fixed null pointer errors

**Issue:** ComplianceScore component calling `.toFixed()` on null values (draft evaluations)

**Solution:**
1. ✅ Added early return in ComplianceScore if score is null/undefined
2. ✅ Fixed `hasScore` check to use `!= null` (handles both null and undefined)
3. ✅ Fixed SummaryStats compliance score check

**Test:** ✅ Verified - Draft evaluations display without errors

---

### Phase H: Draft Evaluation Configuration UI (NEXT SESSION)

**Status:** 📋 Planned for next session

**Goal:** Add configuration form to draft evaluation detail page

**Requirements:**
- Selections grouped horizontally at top of page
- User focused on configuration first
- After selections made, focus shifts to processing status

**Configuration Flow:**
1. **Select Document** (from workspace KB)
2. **Select Document Type** (Policy, Procedure, etc.)
3. **Select Criteria Set** (auto-selected if only one for doc type)
4. **"EVALUATE" Button** (disabled until all fields filled)

**After Submit:**
- Update evaluation with selections
- Start processing
- Show processing status (progress bar, spinner, etc.)
- User focus shifts to status monitoring

**UX Layout:**
```
┌─────────────────────────────────────────────────┐
│  Configure Document Evaluation                   │
├─────────────────────────────────────────────────┤
│  [Document ▼] [Doc Type ▼] [Criteria Set ▼]    │ ← Horizontal
│                                                  │
│  [EVALUATE] (disabled until all selected)        │
├─────────────────────────────────────────────────┤
│  Processing Status (after submit)                │
│  ████████░░░░░░░░ 60%                           │
│  Analyzing document criteria...                  │
└─────────────────────────────────────────────────┘
```

**Estimated Duration:** 2-3 hours

**Files to Update:**
- `EvalDetailPage.tsx` - Add configuration form for draft status
- May need new component: `EvalConfigForm.tsx`

**Test:**
1. Create draft evaluation
2. Navigate to detail page
3. See configuration form (not static content)
4. Select document, doc type, criteria set
5. Click EVALUATE
6. Watch processing status update
7. View completed results

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

**Document Status:** ✅ Phases A-G Complete (Phase H Planned for Next Session)  
**Last Updated:** January 19, 2026 - Completed all runtime fixes  
**Current Phase:** Phase H (Configuration UI) - Planned for next session  
**Branch:** admin-eval-config-s2  
**Session Progress:** Phases A-G complete. Core functionality working, configuration UI needed.

---

## Next Steps for Full Functionality

**Goal:** Enable users to create, process, and view document evaluation results end-to-end.

### Current Status Summary

✅ **What Works Now:**
- Overview tab displays workspace info
- Doc Eval tab shows existing evaluations (viewing only)
- Backend API accepts draft mode evaluation creation (no docTypeId required)
- Backend processing Lambda (eval-processor) processes evaluations asynchronously via SQS

⚠️ **What's Blocked:**
- Cannot CREATE evaluations from UI (Phase C blocked by hook issues)
- Cannot VIEW evaluation details (Phase D blocked by routing issues)

### Step 1: Fix Hook Infinite Loops (Phase C Blocker)

**Priority:** HIGH - Blocks evaluation creation

**Issue:** `useEvalDocTypes` and `useEvalCriteriaSets` hooks cause infinite loops when added to WorkspaceDetailPage.

**Investigation Tasks:**
1. Read `useEvalDocTypes` hook source code
   - Check `useEffect` dependencies
   - Look for function dependencies in dep arrays
   - Identify Zustand store subscription patterns

2. Read `useEvalCriteriaSets` hook source code
   - Same analysis as above

3. Apply hook dependency fixes (same pattern as commit `135f0ba`)
   - Remove function dependencies from `useEffect`
   - Use `// eslint-disable-next-line react-hooks/exhaustive-deps`
   - Ensure only primitive values in dependency arrays

4. Test incrementally
   - Add `useEvalDocTypes` alone, test for loops
   - Add `useEvalCriteriaSets` alone, test for loops
   - Add both together, test for loops

**Files to Update:**
- `templates/_modules-functional/module-eval/frontend/hooks/useEvalDocTypes.ts`
- `templates/_modules-functional/module-eval/frontend/hooks/useEvalCriteriaSets.ts`

**Success Criteria:**
- No infinite loop errors when both hooks are active
- WorkspaceDetailPage remains responsive

---

### Step 2: Fix Routing Issue (Phase D Blocker)

**Priority:** HIGH - Blocks evaluation detail viewing

**Issue:** `/ws/[id]/eval/[evalId]` returns 404, despite file existing at correct location.

**Investigation Tasks:**

1. **Find where `/ws/[id]` route works despite no page.tsx**
   - Search for WorkspaceDetailPage import in app directory
   - Check for layout.tsx files in `app/(workspace)/ws/[id]/`
   - Look for catch-all routes `[...slug]`
   - Check for route group conventions

2. **Understand CORA routing patterns**
   - Review other working nested routes in codebase
   - Check if CORA uses custom routing middleware
   - Look for route registration patterns

3. **Debug why nested route doesn't compile**
   - Check Next.js build output for compilation errors
   - Verify TypeScript errors in module-eval aren't blocking compilation
   - Test with simplified eval detail page (minimal imports)

4. **Alternative if routing fix is complex:**
   - Implement detail view as modal dialog instead
   - Or expandable card within Doc Eval tab
   - Avoids nested routing entirely

**Files to Investigate:**
- `apps/web/app/(workspace)/ws/[id]/` directory structure
- `templates/_modules-functional/module-ws/routes/` for routing patterns
- Next.js `.next/` build output logs

**Success Criteria:**
- `/ws/[id]/eval/[evalId]` route compiles and loads
- OR alternative modal/card implementation works

---

### Step 3: Complete Phase C (Create Functionality)

**Prerequisites:** Step 1 complete (hooks fixed)

**Tasks:**
1. Update WorkspaceDetailPage.tsx:
   - Import fixed `useEvalDocTypes` and `useEvalCriteriaSets`
   - Add "Evaluate Document" button
   - Import and integrate `CreateEvaluationDialog`
   - Wire up form submission handlers

2. Test evaluation creation:
   - Create with existing KB document
   - Create with new file upload
   - Verify draft mode (no docType) works
   - Verify explicit docType selection works

3. Verify progress polling:
   - Watch evaluation status change: pending → processing → completed
   - Test error states: failed evaluations

**Duration:** 30 minutes (after hooks fixed)

---

### Step 4: Complete Phase D (Detail View)

**Prerequisites:** Step 2 complete (routing fixed)

**Tasks:**
1. Wire up evaluation card click handlers
   - Navigate to `/ws/[id]/eval/[evalId]`
   - OR open modal/expanded view

2. Test detail page functionality:
   - View all criteria results
   - Edit individual result (human override)
   - View edit history
   - Download reports (PDF/XLSX)

3. Verify data flow:
   - Evaluation loads correctly
   - Edits save to backend
   - Report export works

**Duration:** 30 minutes (after routing fixed)

---

### Step 5: Phase E (End-to-End Testing)

**Prerequisites:** Steps 3 & 4 complete

**Full Workflow Test:**
1. Create evaluation with KB document
2. Watch status update to "processing"
3. Wait for completion (eval-processor Lambda runs)
4. View completed evaluation details
5. Edit a criteria result
6. Download PDF report
7. Download XLSX report

**Performance Test:**
- No infinite loops
- Page loads < 2 seconds
- No console errors

**Duration:** 30 minutes

---

### Step 6: Backend Validation (Optional)

**Verify eval-processor Lambda:**
1. Check SQS queue receives evaluation creation messages
2. Monitor CloudWatch logs for eval-processor execution
3. Verify evaluation status updates in database
4. Test error handling for processing failures

**Duration:** 15 minutes

---

## Estimated Total Time to Full Functionality

- Step 1 (Fix hooks): 1-2 hours
- Step 2 (Fix routing): 1-2 hours OR 30 min (if using modal alternative)
- Step 3 (Phase C): 30 minutes
- Step 4 (Phase D): 30 minutes
- Step 5 (Phase E): 30 minutes
- **Total:** 3-5 hours

---

## Phase C Blocker Details

**Issue:** Adding `useEvalDocTypes` and `useEvalCriteriaSets` hooks causes infinite loop errors that block all workspace access.

**Error:** "Maximum update depth exceeded" - indicates cascading re-renders from hook interactions.

**Root Cause:** These hooks likely have unstable dependencies in their useEffect calls or problematic Zustand store interactions.

**Resolution Required:** Hook dependency investigation needed before Phase C can be implemented safely (see Step 1 above).

**Current Workaround:** Phase B provides evaluation viewing functionality. Create button can be added in future session after hooks are fixed.
