# Plan: Evaluation Optimization - Sprint 5 (Scoring Architecture & Execution)

**Status:** 🟡 IN PROGRESS (Phase 1: ✅ COMPLETE + DEPLOYED, Phase 2: Next)  
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

## Phase 2: Response Sections

### 2.1 Fixed Sections
- **Status:** (enum/score)
- **Confidence:** (0-100)
- **Justification:** (text)
- **Citations:** (array)

### 2.2 Custom Sections
- Allow user to add extra fields (e.g., "Remediation", "Risk Level")
- Store in `additional_data` JSONB field in result
- Update `ResponseSectionsBuilder` to show Fixed (read-only) vs Custom (editable)

---

## Phase 3: Optimization Execution

### 3.1 RAG Pipeline
- [ ] Implement `rag_pipeline.py` in `opt-orchestrator` Lambda
- [ ] Retrieve context docs from module-kb

### 3.2 Meta-Prompter
- [ ] Implement `meta_prompter.py`
- [ ] Use LLM to generate system prompts based on context + criteria

### 3.3 Execution Engine
- [ ] Loop through variations
- [ ] Call module-eval for each sample
- [ ] Compare results with truth keys
- [ ] Calculate accuracy metrics

---

## Phase 4: UX Enhancements

### 4.1 Citations
- [ ] Implement text highlighting in `DocumentViewer`
- [ ] "Add Citation" button popup
- [ ] Store citation with criterion evaluation

### 4.2 Layout Improvements
- [ ] Fix vertical scrolling in scoring panel
- [ ] Move Next/Prev buttons to header/footer of criterion card

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

- [ ] Scoring logic driven by database rubric (not hardcoded)
- [ ] AI results stored as structured JSON
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

### Priority 1: End-to-End Testing (NEXT)
1. **Run full evaluation test** - Follow `plan_eval-optimization-s5-phase1-testing.md`
   - Upload document to workspace
   - Run evaluation against criteria set
   - Verify database: `ai_result` is JSONB with score + custom fields
   - Verify UI: Score displays as "85% - Fully Compliant" with derived label
   - Verify custom fields appear in "Additional Response Sections" panel
   - Confirm summary section displays correctly (✅ already verified!)

2. **Test custom fields capture**
   - Check if AI returns any custom fields beyond fixed fields
   - Verify those fields display in "Additional Response Sections" panel
   - Test field name formatting (snake_case → Capitalized Words)

### Priority 2: Phase 2 - Response Sections (Next Sprint)
1. Update ResponseSectionsBuilder to enforce fixed sections (score, confidence, explanation, citations)
2. Allow user to add custom sections (e.g., "Remediation", "Risk Level")
3. Validate AI response against structure in eval-processor Lambda

### Priority 3: Documentation Updates
1. Update ADR-019b with new scoring architecture
2. Create user-facing documentation on custom response fields
3. Update module-eval README with scoring rubric configuration

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
