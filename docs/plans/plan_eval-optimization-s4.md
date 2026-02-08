# Plan: Evaluation Optimization - Sprint 4 (Run Details & Truth Set Wizard)

**Status:** � IN PROGRESS  
**Branch:** `feature/eval-optimization-s4`  
**Context:** [memory-bank/context-eval-optimization.md](../../memory-bank/context-eval-optimization.md)  
**Created:** February 6, 2026  
**Duration:** 1-2 weeks (estimated)  
**Dependencies:** ✅ Sprint 3 complete (pending merge)  
**Previous:** [Sprint 3 Plan](completed/plan_eval-optimization-s3.md)  
**Specification:** [spec_eval-opt-workspace-integration.md](../specifications/spec_eval-opt-workspace-integration.md)

---

## Sprint Goal

Implement the Optimization Run Details page and Truth Set creation wizard, enabling business analysts to:
1. Define response sections for AI output structure
2. Create truth sets by manually evaluating sample documents
3. Track progress and save/resume truth set creation

---

## 📊 Sprint 4 Scope (REVISED - Feb 7, 2026)

### ✅ Completed This Sprint

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **Phase 1** | Optimization Run Details page | ✅ COMPLETE |
| **Phase 2** | Response Sections Builder UI | ✅ COMPLETE |
| **Architecture** | Discovered eval scoring flaw + created comprehensive spec | ✅ COMPLETE |
| **UX Design** | Documented 5 critical UX issues with implementation plan | ✅ COMPLETE |

### 🎯 Remaining Work (Finish S4)

**Focus:** Get truth set creation working end-to-end

| Issue | Description | Priority |
|-------|-------------|----------|
| **Issue 1** | Document loading fix (shows "Loading..." instead of content) | 🔴 CRITICAL |
| **Issue 3** | Focus mode (hide left nav, expand to full width) | 🟡 HIGH |
| **Testing** | Validate complete truth set creation workflow | 🟡 HIGH |

**Success Criteria:**
- [ ] Document content loads and displays correctly
- [ ] Focus mode works (Ctrl/Cmd+F toggles)
- [ ] Auto-save on field blur works with visual feedback
- [ ] Can create complete truth set for all criteria
- [ ] Truth set data persists correctly to database
- [ ] All changes synced to test project

### 🔄 Deferred to Sprint 5

**Module-Eval Scoring Architecture:**
- Database migration (`ai_result` TEXT → JSONB, add `scoring_rubric` column)
- Lambda parser updates (extract score directly from AI)
- Prompt template changes (include rubric)
- Frontend changes (derive status from score)
- **Spec:** `docs/specifications/spec_eval-scoring-rubric-architecture.md`

**Optimization Execution Backend:**
- RAG pipeline implementation
- LLM meta-prompting for prompt generation
- Variation testing and comparison
- Results display and A/B comparison

**Lower-Priority UX Enhancements:**
- Issue 2: Citation feature (highlight text → add citations)
- Issue 4: Vertical expansion of scoring panel
- Issue 5: Navigation button placement
- **Plan:** `docs/plans/plan_eval-optimization-s4-ux-enhancements.md`

**Rationale for Deferral:**
1. Eval scoring changes affect core module (higher risk, needs careful implementation)
2. Optimization execution depends on validated truth set workflow
3. Better to finish data collection workflow before adding AI intelligence layer

---

## Phase 1: Optimization Run Details Page

**Route:** `/ws/[id]/runs/[runId]`

### 1.1: Page Structure

- [x] Create `app/ws/[id]/runs/[runId]/page.tsx`
- [x] Header with run name, doc type, criteria set badges
- [x] Status indicator (Draft, In Progress, Optimized, Failed)
- [x] Breadcrumbs navigation

### 1.2: Three-Section Layout

- [x] **Section 1: Response Sections** - Define/edit response structure
- [x] **Section 2: Truth Sets** - List + "New Truth Set" button
- [x] **Section 3: Optimization** - "Optimize Eval Config" button + results area

### Success Criteria Phase 1

- [x] Run details page loads and displays run info
- [ ] Navigation from Optimization tab works correctly (needs testing)
- [x] Three sections visible with proper layout

---

## Phase 2: Response Sections Builder

**Component:** `ResponseSectionsBuilder.tsx`

### 2.1: Section Definition UI

- [x] Add section form (name, type, description, required flag)
- [x] Section types: text, list, number, boolean
- [x] Drag-to-reorder sections
- [x] Remove section functionality

### 2.2: Default Templates

- [x] Default sections: Justification, Non-Compliance Findings, Recommendations
- [x] Quick-add from templates (type selection, custom names)
- [x] Live JSON preview (snake_case keys)

### 2.3: API Integration

- [x] `PUT /api/eval-opt/runs/{runId}/sections` - Save sections
- [x] `GET /api/eval-opt/runs/{runId}/sections` - Load sections
- [x] Save to `eval_opt_response_structures` table

### Success Criteria Phase 2

- [x] User can define response sections
- [x] Sections persist to database
- [x] Sections can be edited and re-saved
- [ ] "New Truth Set" button enabled after sections defined (needs testing)

---

## Phase 3: Truth Set Creation Wizard

**Route:** `/ws/[id]/runs/[runId]/truth-sets/new` or modal

### 3.1: Document Selection Step

- [ ] Select from workspace KB documents
- [ ] Upload new document (adds to workspace KB)
- [ ] Document preview

### 3.2: Criterion Evaluation Wizard

- [ ] Split-screen layout: document viewer (left), evaluation form (right)
- [ ] Progress indicator: "Criterion 3 of 12 (25%)"
- [ ] Navigation: Previous/Next criterion buttons

### 3.3: Per-Criterion Form

- [ ] **Score Range Selector** (5-tier):
  - 0-20 (Non-Compliant)
  - 21-40 (Mostly Non-Compliant)  
  - 41-60 (Partially Compliant)
  - 61-80 (Mostly Compliant)
  - 81-100 (Fully Compliant)
- [ ] **Response Section Fields** (one per defined section)
- [ ] Auto-save on field blur

### 3.4: Document Viewer

- [ ] Display document content
- [ ] Search functionality
- [ ] Scroll to section
- [ ] (Deferred) Text highlighting for citations

### Success Criteria Phase 3

- [ ] User can select/upload document
- [ ] Wizard shows criteria one at a time
- [ ] Progress indicator updates correctly
- [ ] Form fields match defined response sections

---

## Phase 4: Save/Resume Progress

### 4.1: Auto-Save

- [ ] Save progress on field blur
- [ ] Save progress on navigation
- [ ] Debounced save (avoid excessive API calls)

### 4.2: Resume Functionality

- [ ] Load partial truth set on page load
- [ ] Resume from last incomplete criterion
- [ ] Show completion status on truth set list

### 4.3: API Integration

- [ ] `POST /api/eval-opt/runs/{runId}/truth-sets` - Create truth set
- [ ] `PUT /api/eval-opt/runs/{runId}/truth-sets/{tsId}` - Update progress
- [ ] `GET /api/eval-opt/runs/{runId}/truth-sets/{tsId}` - Load with progress

### Success Criteria Phase 4

- [ ] Progress saves automatically
- [ ] User can close browser and resume later
- [ ] Incomplete truth sets show in list with progress %

---

## Database Schema (Existing)

Tables already created in Sprint 2:
- `eval_opt_runs` - Optimization runs
- `eval_opt_response_structures` - Response section definitions
- `eval_opt_truth_keys` - Truth key data per criterion
- `eval_opt_doc_groups` - Document groupings

### Potential Schema Updates

- [ ] Review `eval_opt_truth_keys` for section-based storage
- [ ] Add `progress_pct` column if needed
- [ ] Add `last_criterion_idx` for resume functionality

---

## API Endpoints (New)

### Run Details
- `GET /api/eval-opt/workspaces/{wsId}/runs/{runId}` - Get run with sections

### Response Sections
- `GET /api/eval-opt/runs/{runId}/sections` - Get sections
- `PUT /api/eval-opt/runs/{runId}/sections` - Update sections

### Truth Sets
- `GET /api/eval-opt/runs/{runId}/truth-sets` - List truth sets
- `POST /api/eval-opt/runs/{runId}/truth-sets` - Create truth set
- `GET /api/eval-opt/runs/{runId}/truth-sets/{tsId}` - Get truth set
- `PUT /api/eval-opt/runs/{runId}/truth-sets/{tsId}` - Update truth set

---

## Files to Create

### Frontend Pages
- `app/ws/[id]/runs/[runId]/page.tsx` - Run details
- `app/ws/[id]/runs/[runId]/truth-sets/new/page.tsx` - Truth set wizard (if not modal)

### Frontend Components
- `components/ResponseSectionsBuilder.tsx` - Section definition UI
- `components/TruthSetWizard.tsx` - Criterion evaluation wizard
- `components/DocumentViewer.tsx` - Document display with search
- `components/CriterionEvaluationForm.tsx` - Per-criterion form
- `components/ScoreRangeSelector.tsx` - 5-tier score picker

### Backend (if needed)
- Update `opt-orchestrator/lambda_function.py` for new routes
- Add section and truth set CRUD handlers

---

## Definition of Done

### Sprint 4 Complete When:
- [ ] Run details page fully functional
- [ ] Response sections can be defined and saved
- [ ] Truth sets can be created via wizard
- [ ] Progress saves automatically
- [ ] All new components follow CORA patterns
- [ ] Synced to test project and verified

---

## Session Log

### February 7, 2026 (1:00 PM - 7:00 PM) - Major Architecture Discoveries

**Session Duration:** 6 hours
**Branch:** `feature/eval-optimization-s4`
**Objective:** Fix Lambda regression, investigate eval scoring architecture, design UX enhancements

#### Part 1: Lambda Deployment Fix (1:00-6:01 PM)

**Issue:** API response missing `responseSections` field despite database having the data.

**Root Cause:** Deployed Lambda in test project was out of sync with template (missing code).

**Resolution:**
1. Synced Lambda from template to test project (5:58 PM)
2. Rebuilt Lambda with updated code (5:59 PM)
3. Deployed via Terraform (6:01 PM)
4. Verified: `ai-mod-dev-eval-opt-orchestrator` updated successfully

**Result:** ✅ Lambda now includes `responseSections` in API response

---

#### Part 2: Module-Eval Scoring Architecture Analysis (6:03-6:38 PM)

**🚨 CRITICAL DISCOVERY:** Module-eval's scoring architecture is fundamentally flawed!

**Problem Identified:**
- Current: AI picks status name → System looks up status option → Derives score from option
- Result: All scores are binary (0, 50, or 100) - no granularity!
- Impact: Optimization module cannot measure incremental improvement

**Root Cause Example:**
```python
# WRONG - Gets score from status option
ai_score_value = status_option['score_value']  # Always 0, 50, or 100
```

**Correct Architecture Designed:**
- AI provides numerical score directly (0-100) based on rubric
- UI derives status label from score
- Rubric stored in database (configurable, not hardcoded)

**Deliverable Created:**
- **`docs/specifications/spec_eval-scoring-rubric-architecture.md`** (comprehensive spec)
  - Database schema changes (ai_result TEXT → JSONB, add scoring_rubric column)
  - Lambda parser updates (extract score directly from AI)
  - Prompt template changes (include rubric, request numerical score)
  - Frontend changes (derive status from score)
  - Implementation phases (Sprint 5-6)

**Key Decisions:**
1. Store scoring rubric in `eval_criteria_sets.scoring_rubric` (JSONB, default 5-tier)
2. Convert `ai_result` to JSONB to support structured response sections
3. AI returns: `{"score": 73, "confidence": 85, "justification": "...", ...}`
4. Frontend: `getStatusFromScore(73)` → "Mostly Compliant"

---

#### Part 3: Truth Set Wizard UX Enhancements (6:47-7:00 PM)

**User Feedback on Truth Set UI:**
1. ❌ Document section shows "Loading document..." (CRITICAL - blocks testing)
2. ❌ No citation feature (can't highlight text and add to citations)
3. ❌ No focus mode (left nav reduces working space significantly)
4. ❌ Scoring section doesn't expand vertically (can't see all fields)
5. ❌ Next/Previous buttons far from criterion text (not intuitive)

**UX Pattern Decided:**
- **Auto-save on field blur** (debounced 500ms)
- **Visual feedback:** "Saving..." / "Saved just now" indicator
- **Next/Previous as pure navigation** (no save logic, data already saved)
- **Progress indicator** with checkmarks showing completion

**Deliverable Created:**
- **`docs/plans/plan_eval-optimization-s4-ux-enhancements.md`** (implementation plan)
  - Issue 1: Document loading fix (CRITICAL)
  - Issue 2: Citation feature (HIGH)
  - Issue 3: Focus mode with keyboard shortcut (HIGH)
  - Issue 4: Vertical expansion (MEDIUM)
  - Issue 5: Navigation placement with icon arrows (MEDIUM)

**Implementation Priority:**
1. Issue 1: Document loading (CRITICAL) - Next session
2. Issue 3: Focus mode (HIGH) - Next session
3. Issues 5, 4, 2: Navigation, expansion, citations (MEDIUM/LOW)

---

**Session Outcomes:**
- ✅ Fixed critical Lambda deployment issue
- ✅ Discovered fundamental flaw in eval scoring architecture
- ✅ Designed comprehensive solution with database-driven configuration
- ✅ Created 2 detailed specification documents
- ✅ Documented 5 UX enhancement issues with implementation guidance
- ✅ Established auto-save pattern for wizard

**Next Session Priorities:**
1. Implement document loading fix (Issue 1 - CRITICAL)
2. Implement focus mode (Issue 3 - HIGH)
3. Continue truth set wizard testing and iteration

---

### February 7, 2026 Morning (7:25-7:40 AM) - Sprint 4 Started

**Session Duration:** 15 minutes  
**Branch:** `feature/eval-optimization-s4`  
**Objective:** Close S3 and start S4 with clean baseline

**Completed:**
- ✅ Pulled latest from main (3 commits, 141 files from S3 merge + other teams)
- ✅ Created S4 branch from clean main baseline
- ✅ Updated context file with S4 as active sprint
- ✅ Updated plan status to IN PROGRESS

**Next Steps:**
1. Phase 1: Create Run Details page (`app/ws/[id]/runs/[runId]/page.tsx`)
2. Three-section layout: Response Sections, Truth Sets, Optimization
3. Sync changes to test project at `~/code/bodhix/testing/eval-opt/ai-mod-stack/`

---

**Last Updated:** February 7, 2026
