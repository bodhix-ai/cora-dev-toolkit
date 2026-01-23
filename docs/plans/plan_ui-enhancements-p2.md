# UI Enhancements Plan - Phase 2

**Status**: 🟡 IN PROGRESS  
**Branch**: `ui-enhancements` (continuing from P1)  
**Priority**: 🔴 HIGH (Session: Jan 22, 2026 - Evening)  
**Created**: January 21, 2026  
**Owner**: Engineering Team  

---

## Executive Summary

Phase 2 continues the UI/UX improvements for the Eval and Workspace modules. Phase 1 completed 8 core issues plus significant enhancements. Phase 2 focuses on workspace/audit management features, platform-level customization, and **Eval Details page improvements**.

**Progress: 7/17 issues resolved (41%)**

**Session Focus (Jan 22, 2026 - Evening):**
- 🔴 **HIGH PRIORITY:** Eval Details page improvements (Issues A, A1-A7, B, C, D)
- 🟢 **LOW PRIORITY:** Platform customization (Issues #5-6)

**Completed Today (Jan 22, 2026 - Morning):**
- ✅ Issue #1: Creation Date & Days Active
- ✅ Issue #2: Status Chip  
- ✅ Issue #3: Edit Metadata Dialog
- ✅ Issue #7: Resource Counts (Full Stack Implementation Verified)
- ✅ Issue #4: Eval Card Naming (VERIFIED WORKING)

**Completed Today (Jan 22, 2026 - Evening):**
- ✅ Issue A: Header & Label Cleanup (all 3 sub-issues)
- ✅ Issue A1: Summary Panel Padding
- ✅ Issue A4: Rename to "Evaluation Inputs"
- ✅ Issue A2: Configuration-Based Compliance Score Display (Full Stack)

**In Progress:**
- ⏳ Issues A5-A7 (Documents tab improvements & hyperlinking)

**Modules Affected:**
- `module-ws` - Workspace UI improvements ✅ (4 issues complete)
- `module-eval` - Evaluation card naming ✅ + Eval Details improvements ⏳
- `module-kb` - DocumentStatusBadge error fixed ✅ (bonus fix)
- Platform-level - Theming and branding ⏳ (pending)

---

## Issues to Address

### ⏳ CURRENT SESSION - Eval Details Page Improvements

---

### Issue A: Eval Details - Header & Label Cleanup

**Location:** Evaluation Detail Page  
**Issue:** Duplication of headers and labels causing visual clutter  
**Impact:** Users see redundant information, page feels repetitive  
**Priority:** 🔴 HIGH  
**Status:** ✅ COMPLETE (Jan 22, 2026)

**Sub-Issues:**

**A1. Change Main Header from "Evaluation" to "Evaluation Results"**
- **Status:** ✅ COMPLETE

**A2. Remove Redundant Summary Panel Header**
- **Status:** ✅ COMPLETE

**A3. Update Breadcrumb to Be Dynamic**
- **Status:** ✅ COMPLETE

**Files Modified:**
- `templates/_modules-functional/module-eval/frontend/pages/EvalDetailPage.tsx`
- `templates/_modules-functional/module-eval/frontend/components/EvalSummaryPanel.tsx`

---

### Issue A1: Summary Panel - Reduce Padding Between Collapsed Sections

**Location:** Evaluation Detail Page - Summary Panel  
**Issue:** Too much vertical padding between collapsed sections (Details, Document Summary, Evaluation Summary)  
**Impact:** Wasted vertical space, page feels sparse when sections are collapsed  
**Priority:** 🔴 HIGH  
**Status:** ✅ COMPLETE (Jan 22, 2026)

**Implementation:**
- Changed gap from `gap: 3` to `gap: 1.5`
- Maintains visual separation while improving density

**Files Modified:**
- `templates/_modules-functional/module-eval/frontend/components/EvalSummaryPanel.tsx`

---

### Issue A2: Summary Panel - Move Compliance Score to Top

**Location:** Evaluation Detail Page - Header Area  
**Issue:** Compliance score is buried in collapsible Details section  
**Impact:** Users must expand Details to see overall compliance score (key metric)  
**Priority:** 🔴 HIGH  
**Status:** ✅ COMPLETE (Jan 22, 2026)

**Implementation:** ✅ COMPLETE (Full Stack)
- Created `ComplianceScoreChip` component with configuration-based display
- Integrated in evaluation detail page header (overall score always visible)
- Extended to individual criteria scores in result cards
- Component supports two display modes:
  - Base: Status chip with name/color (always shown)
  - Additional: Numerical score chip (when `show_decimal_score = true`)
- Backend Lambda updated to include `scoreConfig` in API response
- Configuration respects org-level overrides of system defaults
- Graceful degradation when configuration unavailable

**Design Document:** `docs/designs/design_evaluation-score-display.md`
- Complete specification with schema, API requirements, implementation guide
- Configuration precedence rules (org overrides system)
- Score-to-status mapping logic
- Testing checklist and examples

**Files Created:**
- `templates/_modules-functional/module-eval/frontend/components/ComplianceScoreChip.tsx` (NEW)
- `docs/designs/design_evaluation-score-display.md` (NEW)

**Files Modified (Backend):**
- `templates/_modules-functional/module-eval/backend/lambdas/eval-results/lambda_function.py`

**Files Modified (Frontend):**
- `templates/_modules-functional/module-eval/frontend/components/index.ts`
- `templates/_modules-functional/module-eval/frontend/components/EvalQAList.tsx`
- `templates/_modules-functional/module-eval/frontend/pages/EvalDetailPage.tsx`
- `templates/_modules-functional/module-eval/frontend/types/index.ts`

**Git Commits:**
1. `8168258` - docs: Add Issue A2 compliance score design and planning
2. `5b0b50a` - feat(module-eval): Add scoreConfig to evaluation API response
3. `b5d91ad` - feat(module-eval): Add ComplianceScoreChip component
4. `8eac522` - feat(module-eval): Integrate compliance score display in UI

**Testing:** ✅ User tested and verified working

---

### Issue A3: Details Section - Show Document Names Instead of Count

**Location:** Evaluation Detail Page - Evaluation Inputs Section  
**Issue:** "Documents" field shows count (e.g., "3") instead of actual document names  
**Impact:** Users can't see which documents were evaluated without navigating to Documents tab  
**Priority:** 🔴 HIGH (Superseded by A7)  
**Status:** ⏸️ SUPERSEDED BY A7

**Note:** This issue evolved into Issue A7 which includes hyperlinks and tab navigation.

---

### Issue A4: Details Section - Rename "Details" to "Evaluation Inputs"

**Location:** Evaluation Detail Page - Details Section Header  
**Issue:** "Details" label is too generic  
**Impact:** Not clear what information this section contains  
**Priority:** 🔴 HIGH  
**Status:** ✅ COMPLETE (Jan 22, 2026)

**Implementation:**
- Changed section header from "Details" to "Evaluation Inputs"
- Updated aria-label accordingly

**Files Modified:**
- `templates/_modules-functional/module-eval/frontend/components/EvalSummaryPanel.tsx`

---

### Issue A5: Summary Panel - Remove Document Summary Section

**Location:** Evaluation Detail Page - Summary Panel  
**Issue:** Document Summary section is redundant (already shown on Documents tab)  
**Impact:** Duplicated information, cluttered UI  
**Priority:** 🔴 HIGH  
**Status:** ⏳ PLANNED (Current Session)

**Requirements:**
- Remove `CollapsibleDocSummary` component from EvalSummaryPanel
- Document summaries will only appear on Documents tab (see Issue A6)
- Simplifies summary panel to just Evaluation Inputs and Evaluation Overview

**Implementation Notes:**
- Remove the `hasDocSummary` check and related rendering
- Remove `CollapsibleDocSummary` component call
- Keep `CollapsibleDetails` (Evaluation Inputs) and `CollapsibleEvalSummary` (Evaluation Overview)

**Files to Modify:**
- `templates/_modules-functional/module-eval/frontend/components/EvalSummaryPanel.tsx`

**Estimated Time:** 5 minutes

---

### Issue A6: Documents Tab - Enhanced Collapsible Document List

**Location:** Evaluation Detail Page - Documents Tab  
**Issue:** Documents tab shows static list without metadata or formatted summaries  
**Impact:** Users can't see document details or properly formatted summaries  
**Priority:** � HIGH  
**Status:** ⏳ PLANNED (Current Session)

**Requirements:**
- Make each document collapsible/expandable
- **Collapsed state:** Show only document name (clickable to expand)
- **Expanded state:** Show two sections:
  1. **Metadata section** (at top) displaying:
     - Author (from kb_docs.metadata.author)
     - Word Count (from kb_docs.metadata.wordCount)
     - Created Date (from kb_docs.metadata.createdDate - date only, not time)
     - Paragraph Count (from kb_docs.metadata.paragraphCount)
  2. **Document Summary** (below metadata) formatted with markdown rendering

**Implementation Notes:**
- Modify `DocumentsTab` component in `EvalDetailPage.tsx`
- Use Collapse/Accordion pattern for each document
- Apply `markdownToHtml` function to document summaries (same as Evaluation Overview)
- Metadata should be displayed in a compact grid layout
- Each document should be independently expandable

**Data Structure:**
```typescript
interface DocumentMetadata {
  author?: string;
  wordCount?: number;
  createdDate?: string; // ISO format, display date only
  paragraphCount?: number;
}

interface EvaluationDocument {
  id: string;
  name: string;
  fileName?: string;
  summary?: string;
  metadata?: DocumentMetadata; // From kb_docs.metadata JSON field
}
```

**Files to Modify:**
- `templates/_modules-functional/module-eval/frontend/pages/EvalDetailPage.tsx` (DocumentsTab component)

**Estimated Time:** 30 minutes

---

### Issue A7: Evaluation Inputs - Hyperlink Documents to Documents Tab

**Location:** Evaluation Detail Page - Evaluation Inputs Section  
**Issue:** Document field shows count or plain text, no navigation to Documents tab  
**Impact:** Users can't quickly navigate to specific document details  
**Priority:** � HIGH  
**Status:** ⏳ PLANNED (Current Session)

**Requirements:**
- Replace document count with list of document names
- Each document name should be a **clickable hyperlink**
- Pulling documents from `eval_docs_sets` table (via evaluation.documents)
- When user clicks a document name:
  1. Switch to Documents tab
  2. Automatically expand that specific document in the list
- Support multiple documents (most common is 1, but can be many)

**Implementation Notes:**
- Modify `CollapsibleDetails` component in `EvalSummaryPanel.tsx`
- Change Documents field from showing count to showing list of linked names
- Format: `Doc1.pdf, Doc2.pdf, Doc3.pdf` where each is clickable
- Use tab state management to switch to Documents tab
- Pass selected document ID to automatically expand it
- May need to add callback prop to CollapsibleDetails: `onDocumentClick(documentId: string)`
- Parent component (EvalDetailPage) handles tab switch and document expansion

**Technical Approach:**
1. Add `onDocumentClick` callback prop to `CollapsibleDetails`
2. Render document names as clickable links (MUI Link component)
3. On click, call `onDocumentClick(doc.id)` 
4. Parent (EvalDetailPage) receives callback, switches to Documents tab, sets active document
5. DocumentsTab receives `activeDocumentId` prop and auto-expands matching document

**Files to Modify:**
- `templates/_modules-functional/module-eval/frontend/components/EvalSummaryPanel.tsx` (CollapsibleDetails)
- `templates/_modules-functional/module-eval/frontend/pages/EvalDetailPage.tsx` (tab management + document expansion)

**Estimated Time:** 25 minutes

---

### Issue B: Eval Details - Expand All / Collapse All Feature

**Location:** Evaluation Detail Page - Results Tab  
**Issue:** No easy way to expand/collapse all criteria results at once  
**Impact:** Users must click each card individually to see all results  
**Priority:** 🟡 MEDIUM (Deferred after A1-A7)  
**Status:** ⏳ PLANNED

**Estimated Time:** 1 hour

---

### Issue C: Eval Details - Citations Tab Not Populating

**Location:** Evaluation Detail Page - Citations Tab  
**Issue:** Citations tab shows "No citations available" even though citations exist in results  
**Impact:** Users cannot view citations in dedicated tab  
**Priority:** 🟡 MEDIUM (Deferred after A1-A7)  
**Status:** ⏳ PLANNED

**Estimated Time:** 1 hour

---

### Issue D: Eval Details - Citations Not Viewable When Clicking Paperclip Icon

**Location:** Evaluation Detail Page - Result Cards  
**Issue:** Clicking paperclip icon does nothing  
**Impact:** Users cannot view citation details from result cards  
**Priority:** � MEDIUM (Deferred after A1-A7)  
**Status:** ⏳ PLANNED

**Estimated Time:** 1.5-2 hours

---

### ⏸️ DEFERRED - Workspace Enhancements (Completed)

### 1-4, 7: Workspace improvements
**Status:** ✅ COMPLETE (Jan 22, 2026)

---

### ⏸️ DEFERRED - Platform Customization

### 5. Organization Logo Upload
**Priority:** 🟢 Low (DEFERRED)  
**Estimated Time:** 6-8 hours

### 6. MUI Theme Configuration
**Priority:** 🟢 Low (DEFERRED)  
**Estimated Time:** 8-12 hours

---

## Implementation Approach

### Strategy: Incremental Improvements

**Order of Implementation (Current Session - Updated):**
1. **Issue A** - Header/label cleanup ✅ COMPLETE
2. **Issue A1** - Reduce padding ✅ COMPLETE
3. **Issue A4** - Rename to "Evaluation Inputs" ✅ COMPLETE
4. **Issue A5** - Remove Document Summary section (5 mins)
5. **Issue A2** - Move compliance score to top (20 mins)
6. **Issue A6** - Enhance Documents tab (30 mins)
7. **Issue A7** - Hyperlink documents (25 mins)
8. **Issue B** - Expand/Collapse All (1 hour) - DEFERRED
9. **Issue C** - Citations tab fix (1 hour) - DEFERRED
10. **Issue D** - Citation modal (1.5-2 hours) - DEFERRED

**Total Estimated Time for A5-A7:** ~1 hour 20 minutes

---

## Success Criteria

- [x] Workspace cards show creation date and days active
- [x] Workspace cards show status chip with color coding
- [x] Workspace cards have "Edit" menu option
- [x] Workspace cards show resource counts
- [x] Eval cards show dynamic naming
- [x] Eval Details page header changed to "Evaluation Results"
- [x] Eval Details page breadcrumb shows evaluation name
- [x] Eval Summary panel redundant header removed
- [x] Eval Summary sections have reduced padding
- [x] Details section renamed to "Evaluation Inputs"
- [x] Compliance score displayed at top of page (always visible)
- [x] Individual criteria scores use configuration-based display
- [ ] Document Summary section removed from upper panel
- [ ] Documents tab shows collapsible document list with metadata
- [ ] Documents tab shows formatted document summaries
- [ ] Evaluation Inputs section shows document names as hyperlinks
- [ ] Clicking document link navigates to Documents tab and expands document
- [ ] Eval Details results have "Expand All" / "Collapse All" buttons
- [ ] Eval Details Citations tab populates correctly
- [ ] Eval Details paperclip click opens citation modal

---

## Estimated Timeline

| Task | Duration | Notes |
|------|----------|----------|
| **Issue A** | ✅ 30 min | Complete |
| **Issue A1** | ✅ 10 min | Complete |
| **Issue A4** | ✅ 5 min | Complete |
| **Issue A2** | ✅ 1 hour | Complete (Full Stack) |
| **Issue A5** | ⏳ 5 min | Remove section |
| **Issue A6** | ⏳ 30 min | Documents tab |
| **Issue A7** | ⏳ 25 min | Hyperlinks |
| **Issue B** | ⏳ 1 hour | Deferred |
| **Issue C** | ⏳ 1 hour | Deferred |
| **Issue D** | ⏳ 1.5-2 hours | Deferred |

---

## Next Steps

**Current Session:**
1. ✅ Issues A, A1, A4, A2 complete
2. ⏳ Implement Issue A5 (remove Document Summary)
3. ⏳ Implement Issue A6 (enhance Documents tab)
4. ⏳ Implement Issue A7 (hyperlink documents)
5. ⏳ Sync all changes to test project
6. ⏳ User testing and verification

---

**Document Status:** 🟡 IN PROGRESS  
**Current Phase:** Implementation (Eval Details Improvements)  

**Completed:** Issues A, A1, A4, A2 (4 of 17)  
**In Progress:** Issues A5, A6, A7  
**Remaining:** Issues B, C, D (deferred), #5-6 (low priority)  

**Last Updated:** January 22, 2026 11:30 PM EST
