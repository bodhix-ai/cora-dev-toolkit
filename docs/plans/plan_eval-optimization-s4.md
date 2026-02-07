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

## 📊 Sprint 4 Scope

### In Scope

| Phase | Deliverable | Priority |
|-------|-------------|----------|
| **Phase 1** | Optimization Run Details page (`/ws/[id]/runs/[runId]`) | HIGH |
| **Phase 2** | Response Sections Builder UI | HIGH |
| **Phase 3** | Truth Set creation wizard | HIGH |
| **Phase 4** | Save/resume progress functionality | MEDIUM |

### Out of Scope (Deferred to Sprint 5)

- Optimization execution backend (RAG pipeline, meta-prompter)
- Results display and A/B comparison
- Production deployment

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

### February 7, 2026 (7:25 AM - 12:50 PM) - Response Sections Complete

**Session Duration:** ~5 hours (with breaks)  
**Branch:** `feature/eval-optimization-s4`  
**Objective:** Get Response Sections workflow fully functional

**Key Fixes Applied:**

1. **Frontend Auth Pattern** - Changed from `session.accessToken` to `createCoraAuthenticatedClient`
2. **Import Paths** - Fixed 6 → 7 level relative imports for components
3. **ResponseStructureBuilder** - Made section names editable, type-only selection
4. **Backend Permissions** - Fixed `workspace_members` → `ws_members` (ADR-011)
5. **Lambda Column Fix** - Fixed `structure` → `structure_schema` column name
6. **Lambda Column Fix** - Removed non-existent `name` column from INSERT

**API Tracer Validation Findings (for next session):**
- 13 routes need Lambda docstring documentation
- 2 response format issues (snake_case → camelCase)
- 3 key consistency issues

**Verified Working:**
- ✅ Save new sections config to database
- ✅ GET sections config after browser refresh
- ✅ Edit and save changes to sections config

**Commits:**
1. `fix(module-eval-opt): fix permissions and Lambda column references`
2. `feat(eval-opt): add Response Sections and Truth Sets UI pages`
3. `feat(module-eval-opt): add run workflow columns and API routes`

**Next Session Priorities:**
1. Fix API tracer validation errors (Lambda docstring, response format)
2. Test Truth Set creation workflow
3. Continue Phase 3 (Truth Set wizard)

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
