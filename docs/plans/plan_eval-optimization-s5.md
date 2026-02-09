# Plan: Evaluation Optimization - Sprint 5 (Scoring Architecture & Execution)

**Status:** 🟡 IN PROGRESS (Phase 1: ✅ COMPLETE + TESTED, Phase 2B: ✅ COMPLETE + TESTED)  
**Branch:** `feature/eval-optimization-s5`  
**Context:** [memory-bank/context-eval-optimization.md](../../memory-bank/context-eval-optimization.md)  
**Created:** February 8, 2026  
**Started:** February 8, 2026 (7:16 PM)  
**Duration:** 1-2 weeks (estimated)  
**Dependencies:** ✅ Sprint 4 complete (auto-save, studio naming)  
**Previous:** [Sprint 4 Plan](completed/plan_eval-optimization-s4.md)  
**Specification:** [spec_eval-scoring-rubric-architecture.md](../specifications/spec_eval-scoring-rubric-architecture.md)  
**Test Project:** `/Users/aaron/code/bodhix/testing/eval-studio/` (ai-mod-stack + ai-mod-infra)  
**Phase 1 Verified:** February 9, 2026 (Summary section displaying correctly!)  
**Phase 1 Testing PASSED:** February 9, 2026 9:51 AM (Full E2E — scoring, custom fields, UX)

---

## Sprint Goal

Implement the new database-driven scoring architecture, support custom response sections, and build the backend optimization execution pipeline (RAG + Prompt Generation).

---

## 📊 Scope

### 1. Scoring Architecture (CRITICAL)
- **Database:** Migrate `ai_result` from TEXT to JSONB
- **Database:** Add `scoring_rubric` to `eval_criteria_sets`
- **Backend:** Update Lambda to parse/store JSON results
- **Frontend:** Update UI to display scores derived from JSON

### 2. Response Sections (Fixed vs Custom)
- **Concept:** Split response into "Fixed" (required columns) and "Custom" (JSONB)
- **Database:** `eval_opt_response_structures` table usage
- **Frontend:** Update ResponseSectionsBuilder to enforce fixed sections
- **Backend:** Validate AI response against structure

### 3. Optimization Execution (Backend)
- **RAG Pipeline:** Extract context from uploaded documents
- **Meta-Prompter:** Generate prompt variations using LLM
- **Variation Generator:** Create 5-10 variations per run
- **Execution Loop:** Run evaluation for each variation against truth keys

### 4. UX Enhancements (Deferred from S4)
- **Citations:** Highlight text to add citation
- **Vertical Expansion:** Better scrolling for scoring panel
- **Navigation:** Buttons adjacent to criterion text

---

## Phase 1: Scoring Architecture

**Ref:** `docs/specifications/spec_eval-scoring-rubric-architecture.md`

### 1.1 Database Migration ✅ COMPLETE
- [x] ✅ Create migration to change `eval_criteria_results.ai_result` to JSONB
- [x] ✅ Add `scoring_rubric` column to `eval_criteria_sets` (JSONB)
- [x] ✅ Migration verified successful (user ran migration, confirmed idempotent)

**File:** `templates/_modules-functional/module-eval/db/migrations/20260208_sprint5_scoring_architecture.sql`

**Key Features:**
- Backward-compatible CASE statement preserves existing TEXT data
- Legacy TEXT wrapped in `{"explanation": "old text"}` format
- Default 5-tier rubric added to eval_criteria_sets
- Verification block confirms migration success

### 1.2 Schema Updates ✅ COMPLETE
- [x] ✅ Update `008-eval-criteria-sets.sql` - Added scoring_rubric column
- [x] ✅ Update `012-eval-criteria-results.sql` - Changed ai_result to JSONB, marked ai_status_id DEPRECATED

**Impact:** Both schema files now idempotent, verified by user

### 1.3 Backend Updates (Lambda Infrastructure) ✅ COMPLETE
- [x] ✅ Updated prompt template in `get_default_prompt_config()` - Uses `{scoring_rubric}` instead of `{status_options}`
- [x] ✅ Added `format_scoring_rubric()` function - Formats JSONB rubric for AI prompt
- [x] ✅ Updated `evaluate_criteria_item()` - Retrieves rubric from criteria_set and passes to prompt
- [x] ✅ Marked `format_status_options()` as DEPRECATED
- [x] ✅ Updated `parse_evaluation_response()` to extract score directly from AI (not from status)
- [x] ✅ Store full JSON response in `ai_result` field (not just explanation)
- [x] ✅ Updated score calculation logic to use direct AI score

### 1.4 Frontend Updates ✅ COMPLETE
- [x] ✅ Created `scoring.ts` utility with `getStatusFromScore()` and related functions
- [x] ✅ Updated `EvalQAList` to parse JSONB ai_result with `parseAIResult()` function
- [x] ✅ Display numerical scores with derived status labels
- [x] ✅ Display custom fields in "Additional Response Sections" panel

---

## Phase 2: Response Sections, Route Migration & UX Fixes

### 2.0 Sidebar & Org Selector Collapsed Mode Fix (Quick Win) ✅ COMPLETE
- [x] ✅ Pass `collapsed` prop to `<OrganizationSwitcher />`
- [x] ✅ Update `OrganizationSwitcher.tsx` to accept `collapsed` prop
- [x] ✅ When collapsed: render only Avatar as centered IconButton (no name/org/expand arrow)
- [x] ✅ Clicking collapsed avatar opens same org selector Menu (org list + logout)
- [x] ✅ Adjust Menu `anchorOrigin` for collapsed positioning (popover opens to the right of the icon)
- [x] ✅ Org selector menu lists all orgs with check mark on current org (same as expanded behavior)
- [x] ✅ Org switching works from collapsed state (call `switchOrganization()` + `router.refresh()`)
- [x] ✅ Logout action works from collapsed state
- [x] ✅ Show current org indicator on collapsed avatar (title/aria-label with org name)

**Files:** `Sidebar.tsx`, `OrganizationSwitcher.tsx`

### 2A. Route Migration — Workspace-Scoped Eval Config ✅ COMPLETE
- [x] Replace admin hooks (`useDocTypeSelect`, `useCriteriaSetSelect`) with workspace-scoped equivalents
- [x] Update eval creation pages (EvalListPage, EvalDetailPage) to use `/ws/{wsId}/eval/config/*`
- [x] Verify eval config loads from workspace context (not admin context)

### 2B. ResponseStructureBuilder — Fixed vs Custom Sections ✅ COMPLETE
- [x] Update `ResponseStructureBuilder.tsx` to mark Fixed sections as read-only:
  - `score` (number, 0-100) — 🔒 locked, non-removable
  - `confidence` (number, 0-100) — 🔒 locked, non-removable
- [x] **Fix Issues (Feb 9, 2026):**
  - [x] ✅ **ROOT CAUSE:** Backend Lambda validation whitelist missing `'table'` type — silently converted to `'text'`
  - [x] ✅ Added `'table'` to allowed types in `opt-orchestrator/lambda_function.py` line 468
  - [x] ✅ Updated `sections/page.tsx` ResponseSection interface to include `table` type + `columns` + `builtIn` fields
  - [x] ✅ Added `mergeWithBuiltIns()` function to re-apply `builtIn` flag when loading from DB
  - [x] ✅ Fixed section insertion order — new sections now append at end (not after built-ins at index 0)
  - [x] ✅ Missing built-in sections auto-prepended on load
- [x] Allow users to add/remove Custom sections (e.g., "Compliance Gaps", "Recommendations")
- [x] JSON preview includes fixed sections first, then custom sections
- [x] Store custom section definitions in `eval_opt_response_structures` table (via opt-orchestrator Lambda)

### 2C. Backend Validation
- [ ] Update `eval-processor` Lambda to validate AI response against response structure
- [ ] Ensure fixed fields always extracted; custom fields captured dynamically
- [ ] Sync + deploy Lambda

### 2D. Testing
- [ ] Sync all Phase 2 changes to test project (`/fix-and-sync.md` workflow)
- [ ] Deploy updated Lambda
- [ ] Verify fixed sections always appear in results
- [ ] Verify custom sections display in "Additional Response Sections" panel

---

## Phase 3: Optimization Execution

### 3A. RAG Pipeline
- [ ] Implement `rag_pipeline.py` in `opt-orchestrator` Lambda
- [ ] Retrieve context docs from module-kb
- [ ] Extract domain knowledge for prompt generation

### 3B. Meta-Prompter
- [ ] Implement `meta_prompter.py`
- [ ] Use LLM to generate system prompts based on context docs + criteria + response structure

### 3C. Execution Engine
- [ ] Loop through generated prompt variations
- [ ] Call module-eval for each sample document × variation
- [ ] Compare AI results with truth keys
- [ ] Calculate accuracy metrics (precision, recall, F1)
- [ ] Store run results in `eval_opt_run_results`

### 3D. Testing
- [ ] End-to-end optimization run test
- [ ] Verify prompt variations generated
- [ ] Verify accuracy metrics calculated correctly

---

## Phase 4: UX Enhancements

### 4A. Citations
- [ ] Implement text highlighting in `DocumentViewer.tsx`
- [ ] "Add Citation" button popup on text selection
- [ ] Store citation with criterion evaluation in truth set wizard

### 4B. Layout Improvements
- [ ] Fix vertical scrolling in scoring panel
- [ ] Move Next/Prev buttons to header/footer of criterion card

---

## Documentation Updates

- [ ] Update ADR-019b with new scoring architecture details
- [ ] Create user-facing docs on custom response fields
- [ ] Update module-eval README with scoring rubric configuration guide

---

## Database Schema Updates

```sql
-- Migration: JSONB Results
ALTER TABLE eval_criteria_results 
ALTER COLUMN ai_result TYPE JSONB USING ai_result::jsonb;

-- Migration: Rubric
ALTER TABLE eval_criteria_sets 
ADD COLUMN scoring_rubric JSONB DEFAULT '{"type": "5-tier", "min": 0, "max": 100}'::jsonb;
```

---

## Success Criteria

- [x] Scoring logic driven by database rubric (not hardcoded) ✅ Phase 1
- [x] AI results stored as structured JSON ✅ Phase 1
- [ ] Optimization run generates real prompt variations
- [ ] Truth key comparison works with new JSON structure
- [ ] Citations can be added via text highlighting

---

## Session Log

### February 9, 2026 (12:26 AM - 12:36 AM) - Phase 1 Deployment & Verification ✅ COMPLETE

**Session Duration:** 10 minutes  
**Branch:** `feature/eval-optimization-s5`  
**Objective:** Deploy scoring architecture fixes and verify summary display

**Completed:**

1. **Lambda Deployment (All 3 Lambdas)** ✅
   - Built all module-eval Lambdas (eval-config, eval-processor, eval-results)
   - Copied zips to infra repo build directory
   - Deployed via Terraform (21 added, 6 changed, 21 destroyed)
   - New eval_common layer v22 created with updated code
   - All Lambda aliases updated to new versions
   - Duration: ~3 minutes deployment

2. **Verification** ✅
   - eval-processor: Updated 2026-02-09T05:27:57 UTC
   - eval-results: Updated 2026-02-09T05:28:52 UTC
   - eval-config: Updated (part of deployment)
   - ✅ **USER CONFIRMED: Summary section now displays correctly!**

3. **Critical Fix Validated** ✅
   - eval-results Lambda now derives `effectiveStatus` from score using rubric
   - RPC function bypasses Supabase 406 error on JSONB columns
   - UI no longer shows "Not Evaluated" chips when scores exist
   - Score-first architecture working as designed

**Key Achievements:**
- Phase 1 scoring architecture fully deployed and verified
- All backend Lambdas updated with new scoring logic
- Database-driven rubric system working correctly
- Summary section displaying scores with derived status labels

**Files Deployed:**
- `eval-processor/lambda_function.py` (score extraction, custom fields)
- `eval-results/lambda_function.py` (status derivation from score)
- `eval_common` layer v22 (RPC function, scoring utilities)

**Next Session Priorities:**
1. **End-to-end testing** - Run full evaluation to verify custom fields display
2. **Phase 2: Response Sections** - Implement Fixed vs Custom section logic
3. **Frontend enhancements** - Citation highlighting, scoring panel improvements
4. **Phase 3: Optimization Execution** - RAG pipeline + Meta-prompter (deferred)

---

### February 8, 2026 Evening (7:16-8:30 PM) - Phase 1 Complete: Scoring Architecture Implementation

**Session Duration:** 1 hour 14 minutes  
**Objective:** Implement scoring architecture database migration and complete backend/frontend updates

**Completed:**

1. **Database Migration Created & Applied** ✅
   - File: `20260208_sprint5_scoring_architecture.sql`
   - Converts `ai_result` from TEXT to JSONB (backward compatible)
   - Adds `scoring_rubric` JSONB column to `eval_criteria_sets`
   - User verified migration ran successfully and is idempotent

2. **Schema Files Updated** ✅
   - Updated `008-eval-criteria-sets.sql` - Added scoring_rubric with default 5-tier rubric
   - Updated `012-eval-criteria-results.sql` - Changed ai_result to JSONB, marked ai_status_id DEPRECATED
   - Both files verified idempotent by user

3. **Lambda Updates (eval-processor) - COMPLETE** ✅
   - Updated `parse_evaluation_response()`:
     - Extracts score directly from AI response (0-100)
     - Dynamically captures ALL custom fields beyond fixed fields
     - Fixed fields: score, confidence, explanation, citations
     - Custom fields: Anything else AI returns (e.g., compliance_findings, recommendations)
   - Updated `save_criteria_result()`:
     - Stores full JSON object in ai_result JSONB field
     - Handles both dict (new) and string (legacy) formats
     - Logs stored field count for debugging
   - Updated `evaluate_criteria_item()`:
     - Uses AI's direct score (no status derivation)
     - Passes scoring rubric to AI prompt
     - Removed status_option matching logic
   - Added `format_scoring_rubric()` function
   - Marked `format_status_options()` as DEPRECATED

4. **Frontend Utilities Created** ✅
   - File: `frontend/utils/scoring.ts` (NEW - 162 lines)
   - `getStatusFromScore()` - Maps score (0-100) to rubric tier label
   - `getTierFromScore()` - Gets full tier object with description
   - `getScoreColorClass()` - Tailwind colors for score ranges
   - `formatScore()` - Formats score as percentage
   - `DEFAULT_RUBRIC` - 5-tier default matching database

5. **Frontend Component Updates** ✅
   - File: `frontend/components/EvalQAList.tsx` (updated)
   - Added `parseAIResult()` - Handles 3 formats:
     - Legacy plain string
     - Legacy object with "result" field
     - New JSONB with fixed + custom fields
   - Updated score display logic:
     - Shows score with derived status label
     - Uses `getStatusFromScore()` utility
   - Added custom fields section:
     - Blue-highlighted panel titled "Additional Response Sections"
     - Displays all custom fields from AI response
     - Formats field names (snake_case → Capitalized Words)
   - Backward compatible with existing data

6. **Error Fix (opt-orchestrator)** ✅
   - Fixed 3 instances of `common.BadRequestError` → `common.ValidationError`
   - Created fix plan: `docs/plans/plan_fix-bad-request-error.md`
   - Document includes CORA exception standards table for all teams

**Key Architecture Change:**
```
OLD (WRONG):
AI picks "Fully Compliant" → System assigns score 100

NEW (CORRECT):
AI provides score 85 → System derives "Fully Compliant" from rubric
```

**Dynamic Custom Fields:**
```python
# AI can now return ANY fields beyond the fixed fields:
{
  "score": 85,
  "confidence": 90,
  "explanation": "...",
  "citations": [...],
  "compliance_findings": "Strong evidence in section 3",  # Custom!
  "recommendations": "Consider adding...",  # Custom!
  "risk_level": "Low"  # Custom!
}

# Lambda stores ALL fields in JSONB, frontend displays them
```

**Files Modified:**
- `templates/_modules-functional/module-eval/backend/lambdas/eval-processor/lambda_function.py` (1247 lines)
- `templates/_modules-functional/module-eval-studio/backend/lambdas/opt-orchestrator/lambda_function.py` (3 fixes)
- `templates/_modules-functional/module-eval/frontend/utils/scoring.ts` (NEW - 162 lines)
- `templates/_modules-functional/module-eval/frontend/components/EvalQAList.tsx` (updated ~900 lines)
- `docs/plans/plan_fix-bad-request-error.md` (NEW - comprehensive fix guide)

**Phase 1 Status:** ✅ 100% COMPLETE (Backend + Frontend)

---

### February 8, 2026 Evening (7:16-7:50 PM) - Phase 1 Database & Lambda Infrastructure (SUPERSEDED)

**Session Duration:** 34 minutes  
**Objective:** Implement scoring architecture database migration and begin Lambda updates

**Completed:**

1. **Database Migration Created** ✅
   - File: `20260208_sprint5_scoring_architecture.sql`
   - Converts `ai_result` from TEXT to JSONB (backward compatible)
   - Adds `scoring_rubric` JSONB column to `eval_criteria_sets`
   - User verified migration ran successfully

2. **Schema Files Updated** ✅
   - Updated `008-eval-criteria-sets.sql` - Added scoring_rubric with default 5-tier rubric
   - Updated `012-eval-criteria-results.sql` - Changed ai_result to JSONB, marked ai_status_id DEPRECATED
   - Both files ran idempotently (user verified)

3. **Lambda Updates (Partial)** ✅
   - Updated prompt template in `eval-processor/lambda_function.py`
   - Added `format_scoring_rubric()` function
   - Updated `evaluate_criteria_item()` to use rubric from criteria_set
   - Prompt now includes scoring guidance instead of status options

**Remaining Work:**
- Update parser to extract score directly from AI response
- Store full JSON in ai_result (not just explanation text)
- Update score calculation to use direct AI score
- Frontend updates (utility functions, UI components)

**Files Modified:**
- `templates/_modules-functional/module-eval/db/migrations/20260208_sprint5_scoring_architecture.sql` (NEW)
- `templates/_modules-functional/module-eval/db/schema/008-eval-criteria-sets.sql`
- `templates/_modules-functional/module-eval/db/schema/012-eval-criteria-results.sql`
- `templates/_modules-functional/module-eval/backend/lambdas/eval-processor/lambda_function.py`

---

### February 8, 2026 Night (11:00 PM - 11:30 PM) - RPC Function Fix & Critical Issue Discovery

**Session Duration:** 30 minutes  
**Objective:** Fix Supabase 406 error on JSONB columns, discovered critical Lambda issue

**Completed:**

1. **RPC Function Created** ✅
   - File: `20260208_get_eval_criteria_results_rpc.sql`
   - PostgreSQL function bypasses Supabase REST API JSONB limitation
   - Casts `ai_result` and `ai_citations` to TEXT in SELECT
   - Returns all criteria results for an evaluation
   - User verified: Migration runs successfully

2. **eval_common Layer Updated** ✅
   - Created `eval_common/queries.py` with `get_criteria_results()` helper
   - Updated `eval_common/__init__.py` to export new function
   - Uses org_common's existing `rpc()` function

3. **eval-results Lambda Updated** ✅
   - Replaced 3 `find_many()` calls with `get_criteria_results()` RPC call
   - Synced to test project and deployed via Terraform
   - CloudWatch logs confirm: RPC returns 200 OK responses

**Critical Issue Discovered** 🚨

**Problem:** UI shows "Not Evaluated" chips even though scores exist in database.

**Root Cause:** eval-results Lambda (lines 675-681) derives `effectiveStatus` from deprecated `ai_status_id` field (now null) instead of from score.

**Current Code (WRONG):**
```python
effective_status_id = ai_result.get('ai_status_id')  # ❌ NULL
effective_status = status_map.get(effective_status_id, {})  # ❌ Empty dict
```

**Required Fix:** Lambda must derive status from score using rubric:
```python
score = ai_result.get('ai_score_value')
rubric = criteria_set.get('scoring_rubric', {})
effective_status = get_tier_from_score(score, rubric)
```

**Impact:**
- ✅ RPC function works correctly
- ✅ Database returns scores correctly  
- ❌ Lambda doesn't map score → status label
- ❌ Frontend receives `effectiveStatus: null`
- ❌ UI shows "Not Evaluated" chips

**Files Modified:**
- `templates/_modules-functional/module-eval/db/migrations/20260208_get_eval_criteria_results_rpc.sql` (NEW)
- `templates/_modules-functional/module-eval/db/schema/014-eval-rpc-functions.sql` (updated)
- `templates/_modules-functional/module-eval/backend/layers/eval_common/python/eval_common/queries.py` (NEW)
- `templates/_modules-functional/module-eval/backend/layers/eval_common/python/eval_common/__init__.py`
- `templates/_modules-functional/module-eval/backend/lambdas/eval-results/lambda_function.py`
- `docs/plans/plan_eval-optimization-s5-phase1-testing.md` (updated with critical issue)

**Status:** 🔴 BLOCKING - Phase 1 cannot be marked complete until eval-results Lambda is fixed to derive effectiveStatus from score.

---

## Next Session Priorities

### 🚨 Priority 1: Document Viewer — Formatted Document Display
**Issue:** Truth set page shows "No text content found in document" because `KbDocument` type has NO text content fields — only metadata (filename, s3Key, status, chunkCount).

**Root Cause:** KB documents are processed into chunks for RAG. The extracted text isn't stored as a single field on the document record. The `getDocument()` endpoint returns metadata only.

**Investigation Needed:**
1. How does the main CORA app display documents? (check module-kb frontend components for document preview patterns)
2. Does `downloadDocument()` return a presigned S3 URL for the raw file?
3. Can chunks be reassembled into readable text, or should we show the original formatted document?
4. **User requirement:** BA should view the **formatted document** (not unformatted chunk text) — this may mean rendering PDFs/DOCX in an iframe or using a document viewer library

**Possible Approaches:**
- A) Presigned URL → embed original file in iframe/viewer (best for formatted docs)
- B) New KB endpoint to return extracted text (plain text only, loses formatting)
- C) S3 direct fetch of original file + client-side rendering

### 🚨 Priority 2: Truth Set Save/Load — Data Not Persisting
**Issue:** User enters truth set criteria evaluations, sees "Saving..." → "Saved" UI feedback, but when navigating away and returning, the saved content is NOT displayed.

**Investigation Needed:**
1. Which database table stores truth set evaluations? (likely `eval_opt_truth_keys` or similar)
2. Is the PUT/POST endpoint actually writing to the DB? (check opt-orchestrator Lambda handler)
3. Is the GET endpoint returning saved evaluations when truth set is reloaded?
4. Check if `ts.evaluations` array is populated on page load

**Debugging Steps:**
- Check Supabase directly for records in the truth set evaluation table
- Check CloudWatch logs for the save request
- Verify the GET response includes saved evaluation data

### Priority 3: Phase 2 Remaining Items
1. Backend validation of AI response against response structure (2C)
2. Phase 2 testing (2D)

### Priority 4: Phase 3 - Optimization Execution
1. Implement RAG pipeline in opt-orchestrator Lambda
2. Implement meta-prompter for domain-aware prompt generation
3. Execution loop: run evaluations, compare to truth keys

---

## Implementation Notes

**Scoring Architecture Key Changes:**
- **OLD (WRONG):** AI picks status → System assigns score from status mapping
- **NEW (CORRECT):** AI provides score → System derives status label from score

**Rubric Format (JSONB in eval_criteria_sets):**
```json
{
  "tiers": [
    {"min": 0, "max": 20, "label": "Non-Compliant", "description": "..."},
    {"min": 21, "max": 40, "label": "Mostly Non-Compliant", "description": "..."},
    {"min": 41, "max": 60, "label": "Partially Compliant", "description": "..."},
    {"min": 61, "max": 80, "label": "Mostly Compliant", "description": "..."},
    {"min": 81, "max": 100, "label": "Fully Compliant", "description": "..."}
  ]
}
```

**AI Response Format (JSONB in eval_criteria_results.ai_result):**
```json
{
  "score": 85,
  "confidence": 90,
  "explanation": "Document fully addresses requirement with clear evidence...",
  "citations": ["Section 3.2.1 states...", "Appendix A provides..."]
}
```
