# Plan: Evaluation Optimization - Sprint 5 (Scoring Architecture & Execution)

**Status:** 🟡 PLANNED  
**Branch:** `feature/eval-optimization-s5`  
**Context:** [memory-bank/context-eval-optimization.md](../../memory-bank/context-eval-optimization.md)  
**Created:** February 8, 2026  
**Duration:** 1-2 weeks (estimated)  
**Dependencies:** ✅ Sprint 4 complete (auto-save, studio naming)  
**Previous:** [Sprint 4 Plan](completed/plan_eval-optimization-s4.md)  
**Specification:** [spec_eval-scoring-rubric-architecture.md](../specifications/spec_eval-scoring-rubric-architecture.md)

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

### 1.1 Database Migration
- [ ] Create migration to change `eval_criteria_results.ai_result` to JSONB
- [ ] Add `scoring_rubric` column to `eval_criteria_sets` (JSONB)
- [ ] Migrate existing data (if any) or truncate test data

### 1.2 Backend Updates
- [ ] Update `eval-processor` Lambda to output JSON structure
- [ ] Update `eval-results` Lambda to read JSON structure
- [ ] Ensure `ai_score_value` is populated from JSON result

### 1.3 Frontend Updates
- [ ] Update `EvalQAList` to parse JSON result
- [ ] Update status display to use numerical score mapping

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

## Next Steps

1. Create branch `feature/eval-optimization-s5`
2. Create database migrations
3. Update Lambda code
4. Update Frontend UI
