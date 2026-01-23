# UI Enhancements Plan - Phase 2

**Status**: 🟡 IN PROGRESS  
**Branch**: `ui-enhancements` (continuing from P1)  
**Priority**: 🔴 HIGH (Session: Jan 22, 2026 - Evening)  
**Created**: January 21, 2026  
**Owner**: Engineering Team  

---

## Executive Summary

Phase 2 continues the UI/UX improvements for the Eval and Workspace modules. Phase 1 completed 8 core issues plus significant enhancements. Phase 2 focuses on workspace/audit management features, platform-level customization, and **Eval Details page improvements**.

**Progress: 10/17 issues resolved (59%)**

**Session Focus (Jan 23, 2026 - Next Session):**
- 🔴 **CRITICAL:** Backend changes for document display (Issues A6/A7 blocker)
- � **HIGH PRIORITY:** Complete remaining Eval Details improvements (Issues B, D)

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
- ✅ Issue A6: Enhanced Documents Tab (Frontend Complete)
- ✅ Issue A7: Document Hyperlinking (Frontend Complete)
- ✅ Issue C: Remove Citations Tab (Complete)

**Blocked - Awaiting Backend:**
- 🔴 **BLOCKER:** Backend Lambda changes for document names/metadata display

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
**Priority:** 🔴 HIGH  
**Status:** ✅ FRONTEND COMPLETE | ⏸️ BLOCKED ON BACKEND (Jan 22, 2026)

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

**Frontend Implementation:** ✅ COMPLETE
- Created collapsible document list with expand/collapse functionality
- Added metadata display section (Author, Word Count, Created Date, Paragraph Count)
- Added markdown-rendered document summaries
- Auto-expansion support for Issue A7 integration
- Responsive grid layout for metadata
- Graceful fallback when metadata missing

**Backend Changes Required:** 🔴 BLOCKER
See **Backend Lambda Changes (NEXT PRIORITY)** section below.

**Files Modified:**
- `templates/_modules-functional/module-eval/frontend/pages/EvalDetailPage.tsx` (DocumentsTab component)

**Time Spent:** 25 minutes

---

### Issue A7: Evaluation Inputs - Hyperlink Documents to Documents Tab

**Location:** Evaluation Detail Page - Evaluation Inputs Section  
**Issue:** Document field shows count or plain text, no navigation to Documents tab  
**Impact:** Users can't quickly navigate to specific document details  
**Priority:** 🔴 HIGH  
**Status:** ✅ FRONTEND COMPLETE | ⏸️ BLOCKED ON BACKEND (Jan 22, 2026)

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

**Frontend Implementation:** ✅ COMPLETE
- Document names displayed as clickable hyperlinks (comma-separated)
- Click handler switches to Documents tab
- Auto-expands clicked document in Documents tab
- Highlights active document with background color
- Added `onDocumentClick` callback prop to CollapsibleDetails
- Tab state management integrated in parent component

**Backend Changes Required:** 🔴 BLOCKER
See **Backend Lambda Changes (NEXT PRIORITY)** section below.

**Files Modified:**
- `templates/_modules-functional/module-eval/frontend/components/EvalSummaryPanel.tsx` (CollapsibleDetails)
- `templates/_modules-functional/module-eval/frontend/pages/EvalDetailPage.tsx` (tab management + document expansion)

**Time Spent:** 15 minutes

---

### Issue B: Eval Details - Expand All / Collapse All Feature

**Location:** Evaluation Detail Page - Header & Results  
**Issue:** No easy way to expand/collapse all criteria results at once  
**Impact:** Users must click each card individually to see all results  
**Priority:** 🔴 HIGH  
**Status:** ✅ COMPLETE (Jan 23, 2026)

**Implementation:**
- Added "Expand All" / "Collapse All" icon buttons to page header
- Controls ALL collapsible sections (Inputs, Overview, Results, Documents)
- Users can still toggle individual sections independently
- Updated section headers to be more prominent
- Default state: Inputs & Overview expanded, Results collapsed

**Files Modified:**
- `EvalDetailPage.tsx`
- `EvalSummaryPanel.tsx`
- `EvalQAList.tsx`

---

### Issue C: Remove Citations Tab (Replaced by Issue D)

**Location:** Evaluation Detail Page - Tab Navigation  
**Issue:** Dedicated Citations tab provides inferior UX compared to inline citations  
**Impact:** Better UX to show citations in context (via paperclip on criteria results)  
**Priority:** 🔴 HIGH (Part of A6-A7 session)  
**Status:** ✅ COMPLETE (Jan 22, 2026)

**Requirements:**
- Remove Citations tab from TabNavigation component
- Remove CitationsTab rendering logic
- Keep citations data structure for Issue D (paperclip modal)

**Rationale:**
- Issue D provides better UX by showing citations in context with each criteria result
- Dedicated Citations tab removes context and requires extra navigation
- Inline approach (paperclip → modal) is more intuitive

**Implementation:**
- Removed "citations" tab from TabNavigation tabs array
- Removed Citations tab content rendering
- Kept citations data structure for Issue D (paperclip modal)
- Only Results and Documents tabs remain visible

**Files Modified:**
- `templates/_modules-functional/module-eval/frontend/pages/EvalDetailPage.tsx`

**Time Spent:** 5 minutes

---

### Issue D: Eval Details - Citations Viewable via Paperclip Icon

**Location:** Evaluation Detail Page - Result Cards  
**Issue:** Clicking paperclip icon does nothing  
**Impact:** Users cannot view citation details in context with criteria results  
**Priority:** 🔴 HIGH (Elevated - better UX than Issue C)  
**Status:** ⏳ PLANNED

**Requirements:**
- Make paperclip icon clickable in EvalQAList result cards
- Open modal/popover showing citation details
- Display citations in context with the specific criteria result
- Support multiple citations per result

**Implementation Notes:**
- This provides superior UX to separate Citations tab (Issue C)
- Citations shown in context make it clear which criteria they support
- Modal can show full citation details including source, page number, relevance

**Files to Modify:**
- `templates/_modules-functional/module-eval/frontend/components/EvalQAList.tsx`
- Create CitationModal component (or reuse existing)

**Estimated Time:** 1.5-2 hours

---

### 🔴 BACKEND LAMBDA CHANGES (COMPLETED)

**Location:** Module-Eval Backend Lambda  
**Issue:** API returns `null` for document `name`, `fileName`, and missing `metadata` field  
**Impact:** Frontend cannot display document names or metadata (blocks Issues A6/A7 from working)  
**Priority:** 🔴 CRITICAL BLOCKER  
**Status:** ✅ COMPLETE (Jan 23, 2026)

**Current API Response (Broken):**
```json
"documents": [{
    "id": "8129eb96-fe5a-4205-ac7c-035c15b455f6",
    "name": null,           // ❌ NULL
    "fileName": null,       // ❌ NULL
    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "summary": "...",
    "isPrimary": true
    // metadata field missing entirely ❌
}]
```

**Required Changes:**

**File:** `templates/_modules-functional/module-eval/backend/lambdas/eval-results/lambda_function.py`

**Function:** `handle_get_evaluation()` (GET /evaluations/:id endpoint)

**Changes:**

1. **Join with kb_docs table** to get document metadata:
   ```sql
   SELECT 
     eds.doc_id,
     eds.is_primary,
     kd.filename,        -- Use this for 'fileName'
     kd.title,           -- Use this for 'name' (if available)
     kd.metadata         -- Include full metadata JSON
   FROM eval_doc_sets eds
   LEFT JOIN kb_docs kd ON eds.doc_id = kd.id
   WHERE eds.eval_summary_id = %s
   ```

2. **Populate response fields**:
   ```python
   documents.append({
       'id': doc['doc_id'],
       'name': doc.get('title'),           # Document title
       'fileName': doc.get('filename'),    # Original filename
       'mimeType': doc.get('mime_type'),
       'summary': doc.get('summary'),
       'isPrimary': doc['is_primary'],
       'metadata': doc.get('metadata', {}) # Include metadata JSON
   })
   ```

3. **Expected metadata structure** (from kb_docs.metadata):
   ```json
   {
     "author": "John Doe",
     "wordCount": 1500,
     "createdDate": "2026-01-01T12:00:00Z",
     "paragraphCount": 25
   }
   ```

**Additional Issue: Workspace 404 Error**

The workspace fetch is failing during breadcrumb generation:
```
GET /workspaces/{wsId}
Status: 404 Not Found
```

Investigate and fix workspace endpoint or route configuration.

**Estimated Time:** 1-2 hours (database query + testing)

**Success Criteria:**
- API returns document `name` or `fileName` (not null)
- API includes `metadata` object in response
- Frontend displays actual document names instead of "Document 1"
- Frontend displays metadata when available (Author, Word Count, etc.)
- Workspace breadcrumb fetch works (no 404 error)

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

**Order of Implementation (Session Jan 22):**
1. **Issue A** - Header/label cleanup ✅ COMPLETE
2. **Issue A1** - Reduce padding ✅ COMPLETE
3. **Issue A4** - Rename to "Evaluation Inputs" ✅ COMPLETE
4. **Issue A2** - Move compliance score to top ✅ COMPLETE
5. **Issue A6** - Enhance Documents tab ✅ FRONTEND COMPLETE
6. **Issue A7** - Hyperlink documents ✅ FRONTEND COMPLETE
7. **Issue C** - Remove Citations tab ✅ COMPLETE

**Order for Next Session (Jan 23+):**
1. **Backend Lambda Changes** - Document names/metadata 🔴 CRITICAL (1-2 hours)
2. **Issue D** - Paperclip citation modal (1.5-2 hours)
3. **Issue B** - Expand/Collapse All (1 hour) - DEFERRED

**Scope Changes:**
- Issue A5 already complete (Document Summary section removed)
- Issue C changed from "fix Citations tab" to "remove Citations tab"
- Issue D elevated to HIGH priority (better UX than separate tab)

**Total Estimated Time for A6-A7-C-D:** ~2.5-3 hours

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
- [x] Document Summary section removed from upper panel (Issue A5 complete)
- [x] Documents tab shows collapsible document list with metadata (frontend complete)
- [x] Documents tab shows formatted document summaries (frontend complete)
- [x] Evaluation Inputs section shows document names as hyperlinks (frontend complete)
- [x] Clicking document link navigates to Documents tab and expands document (frontend complete)
- [ ] Backend API returns document names and metadata (BLOCKER for A6/A7 to work)
- [x] Citations tab removed (replaced by inline citations via Issue D)
- [ ] Paperclip icon opens citation modal in context
- [ ] Eval Details results have "Expand All" / "Collapse All" buttons (deferred)

---

## Estimated Timeline

| Task | Duration | Notes |
|------|----------|----------|
| **Issue A** | ✅ 30 min | Complete |
| **Issue A1** | ✅ 10 min | Complete |
| **Issue A4** | ✅ 5 min | Complete |
| **Issue A2** | ✅ 1 hour | Complete (Full Stack) |
| **Issue A5** | ✅ 5 min | Complete |
| **Issue A6** | ✅ 25 min | Frontend Complete |
| **Issue A7** | ✅ 15 min | Frontend Complete |
| **Issue C** | ✅ 5 min | Complete |
| **Backend Lambda** | 🔴 1-2 hours | NEXT PRIORITY |
| **Issue D** | ⏳ 1.5-2 hours | Paperclip modal (HIGH) |
| **Issue B** | ⏳ 1 hour | Deferred |

---

## Next Steps

**Completed This Session (Jan 23, 2026):**
1. ✅ **Backend Lambda Changes:** Fixed document name/metadata retrieval (Unblocked A6/A7)
2. ✅ **Issue B:** Implemented Expand/Collapse All with page-wide control
3. ✅ **Issue A6/A7:** Verified working with backend data
4. ✅ **UI Refinements:**
   - Fixed score chip alignment
   - Improved section header styling
   - Cleaned up collapsed state for Overview
   - Set optimal initial expansion states

**Next Session Priority:**
1. ⏳ **Issue D:** Paperclip citation modal (High Priority)
2. ⏳ **User Testing:** Full end-to-end verification

---

**Document Status:** 🟡 IN PROGRESS  
**Current Phase:** Implementation (Eval Details Improvements)  

**Completed:** Issues A, A1, A4, A2, A5, A6, A7, B, C, Backend Fixes (13 of 17)  
**Remaining:** Issue D (Paperclip Modal), #5-6 (low priority)  

**Next Session:** Implement Issue D (Citation Modal) to complete the Eval Details improvements.

**Last Updated:** January 23, 2026 12:15 AM EST
