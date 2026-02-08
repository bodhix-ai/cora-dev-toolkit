# Plan: Evaluation Optimization - Sprint 2 (Core Workflow Implementation)

**Status:** ✅ COMPLETE  
**Branch:** `feature/eval-optimization-s2`  
**Context:** [memory-bank/context-eval-optimization.md](../../memory-bank/context-eval-optimization.md)  
**Created:** February 5, 2026  
**Updated:** February 5, 2026 8:01 PM  
**Duration:** 2.5 weeks  
**Progress:** 100% complete - All deliverables merged to main  
**Dependencies:** ✅ Sprint 1 complete, ✅ All phases complete, ✅ Ready for Sprint 3  
**Next:** Sprint 3 (Integration testing, results display)

---

## 🔄 CRITICAL ARCHITECTURAL CHANGE (February 5, 2026)

**Decision:** Use workspace as optimization container (not separate project entity)

**Rationale:**
- Workspace already provides the container concept
- Workspace members already provide access control
- No need for duplicate project/member tables
- Simpler, follows existing CORA patterns
- Context docs live in workspace KB (using existing module-kb)

**Impact:**
- ❌ Removed `eval_optimization_projects`, `eval_opt_proj_members`, `eval_opt_test_orgs` tables
- ✅ Changed all `proj_id` → `workspace_id` references
- ✅ Updated RLS policies to use `workspace_members` (not project members)
- ✅ Phase 1-3 UI code needs to be updated to use workspaces instead of projects

**See:** `memory-bank/context-eval-optimization.md` for session log details

---

## 📊 Sprint 2 Progress Tracker

| Phase | Status | Key Deliverables | Completion |
|-------|--------|------------------|------------|
| **Phase 0** | ✅ COMPLETE | Module structure, 7 database tables with RLS | 100% |
| **Phase 1** | ✅ COMPLETE | Workspace management UI (refactored from projects) | 100% |
| **Phase 2** | ✅ COMPLETE | Sample document management (upload, list, delete) | 100% |
| **Phase 3** | ✅ COMPLETE | Manual evaluation UI (truth key creation) | 100% |
| **Phase 4A** | ✅ COMPLETE | Route refactoring + Context tab UI | 100% |
| **Phase 4A+** | ✅ COMPLETE | Remaining UI pages + Response Structure Builder | 100% |
| **Phase 4B** | ✅ COMPLETE | Backend Lambda + supporting modules | 100% |
| **Phase 4C** | ✅ COMPLETE | Terraform infrastructure + Lambda layer (ADR-019c) | 100% |
| **Phase 4D** | 📋 SPRINT 3 | Integration testing | Deferred |
| **Phase 5** | 📋 SPRINT 3 | Results display & A/B comparison | Deferred |

**Timeline:**
- ✅ Week 1: Phase 0 & 1 complete
- ✅ Week 2: Phase 2 & 3 complete (sample docs + truth key creation)
- ✅ Week 2.5: Phase 4A complete (route refactoring + Context tab UI)
- ✅ Week 2.5: Phase 4A+ complete (all remaining UI pages + components)
- ✅ Week 2.5: Phase 4B-C complete (backend Lambda + Terraform + module layer)
- ✅ Sprint 2 COMPLETE - Merged to main
- 📋 Sprint 3: Phase 4D (integration testing) + Phase 5 (results display)

---

## Sprint Goal

Build the foundational Business Analyst Workbench for eval prompt optimization: project management, truth key creation via web UI, basic optimization runs, and results display.

---

## 🚨 CRITICAL: RAG Architecture Constraint

**Module-kb is the ONLY RAG provider. DO NOT build new RAG infrastructure.**

| Component | Provider | NOT This ❌ |
|-----------|----------|-------------|
| Document Storage | **module-kb** (existing) | ❌ New storage service |
| Embeddings | **module-ai** (existing) | ❌ Direct OpenAI/Titan calls |
| Vector Search | **module-kb** (existing) | ❌ Pinecone, Weaviate, pgvector |
| Context Docs | **Workspace KB** (existing) | ❌ Separate eval_opt_context_docs storage |

**Implementation:**
1. Context documents are KB documents in the workspace
2. Use existing module-kb APIs for upload, storage, and RAG
3. Embeddings handled by module-ai (already integrated with module-kb)
4. **Zero new vector infrastructure required**

See `spec_eval-optimizer-phase4-redesign.md` for complete architecture.

---

## Executive Summary

Sprint 2 implements the core workflow that enables business analysts to systematically optimize evaluation prompts using sample-driven training. The key innovation is that **truth keys are created via the web UI** - analysts manually evaluate documents, and those assessments become training data for AI optimization.

### Key Workflow

```
1. Create Optimization Project
      ↓
2. Upload Sample Documents
      ↓
3. Manually Evaluate Document (via UI)
   - Review doc content
   - Fill out criteria scores
   - Provide assessment notes
   - This becomes the "truth key"
      ↓
4. Run Optimization
   - AI evaluates same document
   - Compare AI results to truth key
   - Calculate accuracy metrics
      ↓
5. Iterate: Adjust prompt → Re-run → Compare
      ↓
6. As more docs are manually evaluated,
   system learns and improves over time
```

---

## Architecture Foundation (Sprint 1 ✅ Complete)

**Deployment:** Hybrid Option B - See ADR-021
- **Module:** `templates/_modules-functional/module-eval-optimizer/` (backend, db, infrastructure)
- **UI App:** `templates/_project-stack-template/apps/eval-optimizer/` (separate unique UX)
- **Auth:** Shared Cognito/NextAuth with main app
- **Database:** Shared DB with `eval_opt_*` namespace
- **API Integration:** Calls module-access, ws, kb, eval
- **Pattern:** Follows CORA module patterns (see `docs/guides/guide_AI-MODULE-DEVELOPMENT.md`)

**Prototype:** ✅ Complete - 10 files, 887 lines validating architecture

**ConOps:** ✅ Complete - Comprehensive spec with 13 sections

**Key Decision:** Hybrid model enables:
- ✅ Proper module provisioning/enablement (via `module-eval-optimizer`)
- ✅ Separate UI for unique UX (via `apps/eval-optimizer`)
- ✅ API-first approach
- ✅ Paid feature monetization capability

---

## Sprint 2 Scope

### Phase 0: Module Structure Creation (Day 1) 🏗️ NEW

**Objective:** Create `module-eval-optimizer` following CORA module patterns

**Directory Structure:**
```
templates/_modules-functional/module-eval-optimizer/
├── module.config.yaml      # Provisioning/enablement config
├── module.json             # Module metadata
├── README.md               # Module documentation
├── backend/                # Stub for future Lambda APIs
│   └── lambdas/
│       └── opt-projects/   # Future: Project management API
├── db/
│   ├── schema/
│   │   ├── 001-eval-opt-projects.sql
│   │   ├── 002-eval-opt-project-members.sql
│   │   ├── 003-eval-opt-document-groups.sql
│   │   ├── 004-eval-opt-truth-keys.sql
│   │   ├── 005-eval-opt-runs.sql
│   │   ├── 006-eval-opt-run-results.sql
│   │   └── 007-eval-opt-rls.sql
│   └── migrations/
├── frontend/               # Stub (actual UI in apps/eval-optimizer)
│   └── index.ts
└── infrastructure/
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    └── versions.tf
```

**Key Files:**
- `module.config.yaml` - Module configuration for provisioning/enablement
- `module.json` - Dependencies, API endpoints, database tables
- Database schemas reference EXISTING live tables:
  - `eval_doc_types` (per-org doc types)
  - `eval_criteria_sets` (per-org criteria sets)
  - `eval_criteria_items` (criteria items)
  - `eval_sys_status_options` (system-level status options)
- Infrastructure Terraform stubs for future Lambda deployment

**Success Criteria:**
- [x] Module directory structure created
- [x] `module.config.yaml` created
- [x] `module.json` created
- [x] `README.md` created
- [x] 7 database schema files created
- [x] RLS policies created
- [x] Infrastructure Terraform stubs created
- [x] Frontend stub created

---

### Phase 1: Project Management (Week 1) ✅ COMPLETE

**Objective:** Enable analysts to create and manage optimization projects

**Status:** ✅ COMPLETE (February 5, 2026 9:33 AM)

**Database Tables:**
```sql
-- Optimization projects
CREATE TABLE eval_optimization_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    domain VARCHAR(100),  -- e.g., 'it-security-policies', 'land-appraisals'
    org_id UUID NOT NULL REFERENCES organizations(id),
    
    -- CRITICAL: Lock project to specific doc type + criteria set
    doc_type_id UUID NOT NULL REFERENCES eval_doc_types(id),
    criteria_set_id UUID NOT NULL REFERENCES eval_criteria_sets(id),
    
    -- Versioning: Capture criteria set state at project creation
    criteria_set_version INTEGER NOT NULL DEFAULT 1,  -- Increment when criteria change
    criteria_set_hash VARCHAR(64),  -- Hash of criteria content for integrity check
    
    created_by UUID NOT NULL REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project members (Owner/Admin/User roles)
CREATE TABLE eval_opt_project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(user_id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'user')),
    added_by UUID NOT NULL REFERENCES user_profiles(user_id),
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- Test orgs for optimization runs
CREATE TABLE eval_opt_test_orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id),
    org_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Frontend Components:**
- `app/projects/page.tsx` - Project list (with create button)
- `app/projects/new/page.tsx` - Create project form
- `app/projects/[id]/page.tsx` - Project detail with tabs
- `components/ProjectCard.tsx` - Project card in list
- `components/ProjectMembers.tsx` - Member management UI

**API Routes:**
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `POST /api/projects/{id}/members` - Add member
- `DELETE /api/projects/{id}/members/{user_id}` - Remove member

**Success Criteria:**
- [x] ✅ Analyst can create optimization project
- [x] ✅ Project linked to criteria set
- [x] ✅ Members can be added/removed (owner only)
- [ ] ⚠️ Test org created automatically for project (API implementation needed)

---

### Phase 2: Sample Document Management (Week 1-2)

**Objective:** Enable upload and management of sample documents

**Database Tables:**
```sql
-- Document groups (primary doc + proof artifacts)
CREATE TABLE eval_opt_document_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    primary_doc_id UUID NOT NULL,  -- kb_docs.id
    status VARCHAR(50) NOT NULL DEFAULT 'pending_evaluation',  -- pending_evaluation, evaluated, validated
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supporting documents for a group
CREATE TABLE eval_opt_document_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES eval_opt_document_groups(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL,  -- kb_docs.id
    doc_type VARCHAR(50) NOT NULL,  -- 'primary', 'proof', 'supporting'
    added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Frontend Components:**
- `app/projects/[id]/samples/page.tsx` - Sample document list
- `app/projects/[id]/samples/upload/page.tsx` - Upload sample docs
- `components/DocumentGroupCard.tsx` - Document group card
- `components/DocumentUploader.tsx` - File upload component

**API Routes:**
- `GET /api/projects/{id}/samples` - List sample documents
- `POST /api/projects/{id}/samples/upload` - Upload sample doc (calls module-kb)
- `GET /api/projects/{id}/samples/{group_id}` - Get document group
- `DELETE /api/projects/{id}/samples/{group_id}` - Delete sample

**Integration:**
- **module-ws:** Create workspace for project samples
- **module-kb:** Upload documents to workspace

**Success Criteria:**
- [ ] Upload sample document to project
- [ ] Create document group (primary + artifacts)
- [ ] View list of samples in project
- [ ] Delete samples

---

### Phase 3: Truth Key Creation via Web UI (Week 2) 🎯 KEY FEATURE

**Objective:** Enable analysts to manually evaluate documents, creating truth keys

**This is the critical innovation:** Instead of uploading Excel truth keys, analysts use the web UI to evaluate documents manually. These manual evaluations become the training data.

**Database Tables:**
```sql
-- Manual evaluations (truth keys)
CREATE TABLE eval_opt_truth_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_group_id UUID NOT NULL REFERENCES eval_opt_document_groups(id) ON DELETE CASCADE,
    criteria_item_id UUID NOT NULL REFERENCES eval_criteria_items(id),
    
    -- CRITICAL: Version truth keys against doc type + criteria set
    doc_type_id UUID NOT NULL REFERENCES eval_doc_types(id),
    criteria_set_id UUID NOT NULL REFERENCES eval_criteria_sets(id),
    criteria_set_version INTEGER NOT NULL,  -- From project at time of evaluation
    
    -- Manual assessment by analyst
    truth_status_id UUID NOT NULL REFERENCES eval_sys_status_options(id),
    truth_confidence INTEGER CHECK (truth_confidence >= 0 AND truth_confidence <= 100),
    truth_explanation TEXT NOT NULL,
    truth_citations JSONB,  -- Array of quotes from document
    
    -- Metadata
    evaluated_by UUID NOT NULL REFERENCES user_profiles(user_id),
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    validated BOOLEAN NOT NULL DEFAULT false,
    validated_by UUID REFERENCES user_profiles(user_id),
    validated_at TIMESTAMPTZ,
    
    -- Validity tracking
    is_valid BOOLEAN NOT NULL DEFAULT true,  -- Mark false if criteria set changed
    invalidated_at TIMESTAMPTZ,
    invalidation_reason TEXT,
    
    UNIQUE(document_group_id, criteria_item_id)
);
```

**Frontend Components (NEW):**
- `app/projects/[id]/evaluate/[group_id]/page.tsx` - **Manual evaluation UI**
  - Left panel: Document viewer (primary doc content)
  - Right panel: Criteria evaluation form
  - For each criterion:
    - Status dropdown (Compliant, Non-compliant, Partially Compliant, etc.)
    - Confidence slider (0-100)
    - Explanation text area
    - Citations selector (highlight text in doc → add as citation)
  - Save button → Creates truth key record
  
- `components/DocumentViewer.tsx` - Document content display with text selection
- `components/CriteriaEvaluationForm.tsx` - Form for single criterion
- `components/CitationSelector.tsx` - UI for selecting text as citations

**API Routes:**
- `GET /api/projects/{id}/samples/{group_id}/evaluate` - Get doc + criteria for evaluation
- `POST /api/projects/{id}/truth-keys` - Save manual evaluation (create truth keys)
- `GET /api/projects/{id}/truth-keys` - List all truth keys in project
- `PUT /api/projects/{id}/truth-keys/{id}` - Update truth key
- `DELETE /api/projects/{id}/truth-keys/{id}` - Delete truth key

**Workflow:**
1. Analyst selects sample document from list
2. Clicks "Evaluate Document" button
3. UI loads document content and criteria
4. Analyst reads document, fills out form for each criterion:
   - Selects status from dropdown
   - Adjusts confidence slider
   - Writes explanation
   - Highlights relevant text and adds as citations
5. Clicks "Save Evaluation"
6. System creates truth key records (one per criterion)
7. Document status changes: `pending_evaluation` → `evaluated`

**Success Criteria:**
- [ ] Manual evaluation UI functional
- [ ] Can select status, confidence, explanation, citations
- [ ] Truth keys saved to database
- [ ] Can edit existing truth keys
- [ ] Progress indicator (5 of 20 criteria evaluated)

---

### Phase 4: Basic Optimization Run (Week 2)

**Objective:** Run AI evaluation and compare to truth keys

**Database Tables:**
```sql
-- Optimization runs
CREATE TABLE eval_opt_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    prompt_version_id UUID,  -- Future: REFERENCES eval_prompt_versions(id)
    
    -- Prompt configuration (stored for this run)
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    temperature DECIMAL(3,2) NOT NULL,
    max_tokens INTEGER NOT NULL,
    
    -- Run metadata
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Results summary
    total_samples INTEGER NOT NULL DEFAULT 0,
    total_criteria INTEGER NOT NULL DEFAULT 0,
    overall_accuracy DECIMAL(5,2),  -- Percentage
    
    created_by UUID NOT NULL REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual results per criterion per sample
CREATE TABLE eval_opt_run_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES eval_opt_runs(id) ON DELETE CASCADE,
    document_group_id UUID NOT NULL REFERENCES eval_opt_document_groups(id),
    criteria_item_id UUID NOT NULL REFERENCES eval_criteria_items(id),
    truth_key_id UUID NOT NULL REFERENCES eval_opt_truth_keys(id),
    
    -- AI evaluation results
    ai_status_id UUID NOT NULL REFERENCES eval_sys_status_options(id),
    ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    ai_explanation TEXT NOT NULL,
    ai_citations JSONB,
    
    -- Comparison to truth key
    status_match BOOLEAN NOT NULL,  -- Did AI status match truth status?
    confidence_diff INTEGER,  -- abs(ai_confidence - truth_confidence)
    
    -- Classification
    result_type VARCHAR(50) NOT NULL,  -- 'true_positive', 'true_negative', 'false_positive', 'false_negative'
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(run_id, document_group_id, criteria_item_id)
);
```

**Frontend Components:**
- `app/projects/[id]/runs/page.tsx` - Optimization run list
- `app/projects/[id]/runs/new/page.tsx` - Create new run (configure prompt)
- `app/projects/[id]/runs/[run_id]/page.tsx` - Run results detail
- `components/PromptConfigForm.tsx` - Prompt configuration UI
- `components/RunProgressIndicator.tsx` - Progress bar for running optimization

**API Routes:**
- `POST /api/projects/{id}/runs` - Start optimization run
- `GET /api/projects/{id}/runs` - List runs
- `GET /api/projects/{id}/runs/{run_id}` - Get run results
- `GET /api/projects/{id}/runs/{run_id}/results` - Detailed results

**Optimization Logic (Backend):**
```python
# Pseudocode for optimization run
def run_optimization(project_id, prompt_config):
    # 1. Get all evaluated samples in project
    samples = get_document_groups(project_id, status='evaluated')
    
    # 2. For each sample:
    for sample in samples:
        # Get truth keys (manual evaluations)
        truth_keys = get_truth_keys(sample.id)
        
        # Run AI evaluation using prompt_config
        ai_eval = call_module_eval(sample, prompt_config)
        
        # 3. Compare AI results to truth keys
        for truth_key in truth_keys:
            ai_result = ai_eval.get_result_for_criterion(truth_key.criteria_item_id)
            
            # Calculate match
            status_match = (ai_result.status_id == truth_key.truth_status_id)
            confidence_diff = abs(ai_result.confidence - truth_key.truth_confidence)
            
            # Classify result (TP/TN/FP/FN)
            result_type = classify_result(ai_result, truth_key)
            
            # Store result
            save_run_result(run_id, sample.id, truth_key, ai_result, status_match, result_type)
    
    # 4. Calculate overall accuracy
    accuracy = calculate_accuracy(run_id)
    update_run(run_id, status='completed', accuracy=accuracy)
```

**Success Criteria:**
- [ ] Can start optimization run with prompt config
- [ ] AI evaluates all samples in project
- [ ] Results compared to truth keys
- [ ] Overall accuracy calculated
- [ ] Run status tracked (pending → running → completed)

---

### Phase 5: Results Display (Week 3)

**Objective:** Display optimization results with actionable insights

**Frontend Components:**
- `app/projects/[id]/runs/[run_id]/page.tsx` - Enhanced results page
  - **Overall Metrics Card:**
    - Overall accuracy (%)
    - Total samples evaluated
    - True positives / False positives
    - True negatives / False negatives
    - Precision / Recall / F1 score
  
  - **Per-Criteria Breakdown Table:**
    | Criterion | Accuracy | TP | FP | TN | FN | Issues |
    |-----------|----------|----|----|----|----|--------|
    | Criterion 1 | 85% | 8 | 1 | 9 | 1 | View |
    | Criterion 2 | 70% | 6 | 2 | 8 | 3 | View |
  
  - **Error Analysis:**
    - Click "View Issues" → See specific false positives/negatives
    - For each error:
      - Document name
      - Truth key (what it should be)
      - AI result (what it got)
      - Side-by-side comparison
  
  - **A/B Comparison:**
    - Select two runs to compare
    - Show delta in accuracy per criterion
    - Highlight improvements/regressions

**Components:**
- `components/OptimizationMetrics.tsx` - Overall metrics display
- `components/CriteriaBreakdownTable.tsx` - Per-criteria table
- `components/ErrorAnalysis.tsx` - Detailed error list
- `components/RunComparison.tsx` - A/B comparison UI

**API Routes:**
- `GET /api/projects/{id}/runs/{run_id}/metrics` - Summary metrics
- `GET /api/projects/{id}/runs/{run_id}/breakdown` - Per-criteria breakdown
- `GET /api/projects/{id}/runs/{run_id}/errors` - False positives/negatives
- `GET /api/projects/{id}/runs/compare?run1={id1}&run2={id2}` - A/B comparison

**Success Criteria:**
- [ ] Analyst sees overall accuracy for run
- [ ] Can drill down to per-criterion accuracy
- [ ] Can view specific errors (FP/FN)
- [ ] Can compare two runs side-by-side
- [ ] Actionable insights for prompt improvement

---

## Out of Scope for Sprint 2

These features are deferred to Sprint 3+ to keep Sprint 2 focused:

1. **Prompt Versioning System** (Sprint 3)
   - Database-backed prompt versions
   - Version comparison
   - Rollback capability

2. **Production Deployment Workflow** (Sprint 3)
   - Deploy optimized prompt to module-eval
   - Deployment validation
   - Rollback mechanism

3. **Batch Processing** (Sprint 4)
   - Process 100+ samples efficiently
   - Parallel AI calls
   - Progress tracking

4. **Multi-Model Comparison** (Sprint 4)
   - Compare GPT-4 vs Claude vs Nova
   - Model-specific optimizations

5. **Advanced Metrics** (Sprint 4)
   - Confidence calibration
   - Error pattern analysis
   - Recommendation engine

---

## Implementation Timeline

### Week 1: Foundation
- **Days 1-2:** Database schema + migrations
- **Days 3-4:** Project management UI (CRUD)
- **Day 5:** Sample document upload

### Week 2: Core Workflow
- **Days 1-3:** Manual evaluation UI (truth key creation) 🎯
- **Days 4-5:** Optimization run backend logic

### Week 3: Results & Polish
- **Days 1-2:** Results display UI
- **Day 3:** A/B comparison
- **Days 4-5:** Testing, bug fixes, documentation

---

## Technical Decisions

### 1. Module Architecture (HYBRID OPTION B)

**Decision:** Hybrid model with separate module and UI app

**Structure:**
- **Module:** `module-eval-optimizer/` (backend, db, infrastructure)
- **UI App:** `apps/eval-optimizer/` (separate unique UX)

**Rationale:**
1. **Provisioning/Enablement:** Module structure enables proper CORA provisioning patterns
2. **API-First:** Backend APIs can be consumed by any UI
3. **Unique UX:** Separate app allows analyst-specific workflows without cluttering main app
4. **Monetization:** Enables paid feature model (open source core + paid enhancement)

**Trade-offs:**
- ⚠️ Slightly more complex structure (two locations)
- ✅ But: Follows CORA patterns and enables key business capabilities

---

### 2. Reference Existing Eval Tables

**Decision:** Reference existing live `eval_doc_types` and `eval_criteria_sets` (per-org)

**Rationale:**
- These tables are already live and being used in production
- No need to create system-level doc type tables for Sprint 2
- Can defer system-level refactoring to future sprint if needed
- Optimizer projects will reference existing per-org tables

**Implementation:**
```sql
-- Projects reference existing per-org tables
CREATE TABLE eval_optimization_projects (
    doc_type_id UUID NOT NULL REFERENCES eval_doc_types(id),
    criteria_set_id UUID NOT NULL REFERENCES eval_criteria_sets(id),
    ...
);
```

**Trade-offs:**
- ⚠️ May need system-level refactoring later for cross-org optimization
- ✅ But: Simpler for Sprint 2, works with existing data

---

### 3. Truth Key Creation Method

**Decision:** Web UI for manual evaluation (not Excel upload)

**Rationale:**
- Lower barrier to entry (no template download/upload)
- Integrated document viewer
- Real-time validation
- Better UX for citing text
- Can still export/import later if needed

**Trade-offs:**
- More UI development upfront
- But: Better long-term UX and adoption

---

### 4. Optimization Run Execution

**Decision:** Synchronous runs for Sprint 2 (async in Sprint 3)

**Rationale:**
- Simpler implementation (no queue, no polling)
- Acceptable for 5-10 samples
- Can add async processing in Sprint 3 for larger batches

**Trade-offs:**
- User waits for run to complete
- But: < 2 minutes for 10 samples x 10 criteria

---

### 5. Prompt Configuration Storage

**Decision:** Store prompt config with each run (no versioning yet)

**Rationale:**
- Simpler for Sprint 2
- Can always add prompt_versions table in Sprint 3
- Each run is self-contained

**Trade-offs:**
- Duplicate prompt storage per run
- But: Enables exact reproducibility

---

### 6. System-Level vs Org-Level Configuration 🎯 DEFERRED

**Note:** This decision from the original Sprint 2 plan is DEFERRED to a future sprint.

**Problem:**
- Currently, doc type + criteria set is configured **per org** (`eval_doc_types`, `eval_cfg_org`)
- This means BAs would need to create truth sets for **every org** separately
- Inefficient: Duplicate manual evaluation work across orgs
- Slow org onboarding: Each org must configure doc types + criteria from scratch

**Decision:** Promote doc type + criteria set to **system-level shared configurations**

**Rationale:**
1. **Truth set development is system-level work**
   - IT Security Policies + NIST criteria set should be optimized **once**
   - All orgs using that combination benefit from the optimized prompt
   - BAs don't duplicate manual evaluation work

2. **Faster org onboarding**
   - New orgs can **inherit** pre-configured doc type + criteria set combinations
   - Pre-optimized prompts already tuned
   - Org admin just selects: "Enable IT Security Policies (NIST criteria)"

3. **Centralized quality**
   - System admins maintain canonical doc types and criteria sets
   - Updates propagate to all orgs (with org opt-in)
   - Consistent evaluation standards across platform

**Implementation:**

```sql
-- System-level doc types (authoritative source)
CREATE TABLE eval_sys_doc_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    domain VARCHAR(100),  -- 'it-security', 'appraisals', 'foia', etc.
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System-level criteria sets (authoritative source)
CREATE TABLE eval_sys_criteria_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,  -- Increment when criteria change
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System-level criteria items (tied to sys criteria sets)
CREATE TABLE eval_sys_criteria_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    criteria_set_id UUID NOT NULL REFERENCES eval_sys_criteria_sets(id),
    criteria_id VARCHAR(100) NOT NULL,
    requirement TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Org "adopts" system-level doc type + criteria set (inheritance)
CREATE TABLE eval_org_adopted_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    sys_doc_type_id UUID NOT NULL REFERENCES eval_sys_doc_types(id),
    sys_criteria_set_id UUID NOT NULL REFERENCES eval_sys_criteria_sets(id),
    
    -- Customization tracking
    is_customized BOOLEAN NOT NULL DEFAULT false,
    customization_notes TEXT,
    
    adopted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    adopted_by UUID NOT NULL REFERENCES user_profiles(user_id),
    
    UNIQUE(org_id, sys_doc_type_id, sys_criteria_set_id)
);
```

**Optimization projects now reference system-level configs:**
```sql
-- Updated: Projects reference system-level configs
CREATE TABLE eval_optimization_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Reference SYSTEM-LEVEL configurations
    sys_doc_type_id UUID NOT NULL REFERENCES eval_sys_doc_types(id),
    sys_criteria_set_id UUID NOT NULL REFERENCES eval_sys_criteria_sets(id),
    criteria_set_version INTEGER NOT NULL DEFAULT 1,
    
    -- Projects are system-level (not org-specific)
    -- But may be created by org admin who wants to contribute
    created_by UUID NOT NULL REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**BA Task Management Dashboard:**

New feature: **System-level dashboard** showing which doc type + criteria set combinations need work

```
+------------------------------------------------------------------+
| Doc Type + Criteria Set Coverage Dashboard                       |
+------------------------------------------------------------------+
| Combination                          | Samples | Accuracy | Status|
|--------------------------------------|---------|----------|-------|
| IT Security Policies + NIST          | 25      | 85%      | ✅ Ready |
| Land Appraisals + Uniform Standards  | 12      | 72%      | ⚠️ Needs work |
| FOIA Redaction + Privacy Act         | 5       | 60%      | 🔴 Needs samples |
| Proposals + Federal Acquisition Reg  | 0       | -        | 📋 No truth set  |
+------------------------------------------------------------------+
```

**Benefits:**
- ✅ BAs see which combinations need truth sets
- ✅ No duplicate work across orgs
- ✅ Orgs inherit pre-optimized configs
- ✅ Faster org onboarding
- ✅ Centralized quality control

**Trade-offs:**
- ⚠️ Requires system admin privileges to create doc types + criteria sets
- ⚠️ Orgs lose flexibility to customize (can still customize if needed)
- ✅ Overall: Major efficiency gain outweighs trade-offs

---

## Success Criteria (Sprint 2 Complete)

### Must Have
- [ ] Analyst can create optimization project
- [ ] Analyst can upload 5-10 sample documents
- [ ] Analyst can manually evaluate documents via web UI
- [ ] Analyst can run optimization with custom prompt
- [ ] System displays accuracy metrics (expect >80% for test set)
- [ ] Analyst can identify which criteria have low accuracy
- [ ] Analyst can compare two optimization runs

### Nice to Have
- [ ] Export truth keys to spreadsheet
- [ ] Import truth keys from spreadsheet
- [ ] Bulk evaluation (evaluate all samples in batch)
- [ ] Email notification when run completes

---

## Risks & Mitigations

| Risk | Impact | Mitigation | Owner |
|------|--------|------------|-------|
| Manual evaluation UI too complex | High | Start with simple form, iterate | Frontend |
| AI evaluation too slow | Medium | Async processing in S3 if needed | Backend |
| Truth key validation issues | Medium | Clear UI guidance, field validation | Frontend |
| Accuracy calculation bugs | High | Unit tests, known test cases | Backend |

---

## Dependencies

- [x] ✅ Sprint 1 complete (architecture, prototype, ConOps)
- [x] ✅ ADR-021 (deployment architecture)
- [x] ✅ Database access to create `eval_opt_*` tables
- [ ] ⚠️ Sample documents for testing (need 5-10 real examples)
- [ ] ⚠️ Criteria set configured in database

---

## Definition of Done

### Code
- [ ] All database migrations created and tested
- [ ] All frontend components implemented
- [ ] All API routes functional
- [ ] Unit tests for optimization logic
- [ ] Integration tests for end-to-end workflow

### Documentation
- [ ] User guide for analysts (how to use the tool)
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Deployment guide

### Quality
- [ ] No TypeScript errors
- [ ] Accessibility compliance (ADR-019a)
- [ ] Responsive design (mobile/tablet)
- [ ] Error handling for edge cases

### Demo
- [ ] End-to-end demo with real sample documents
- [ ] Show manual evaluation → optimization run → results
- [ ] Demonstrate accuracy improvement after prompt adjustment

---

## Session Log

### February 5, 2026 10:00 AM - Phase 2 & 3 Complete (Sample Docs + Manual Evaluation UI)

**Session Duration:** 1 hour 12 minutes  
**Session Goal:** Implement sample document management and manual evaluation UI

**Phase 2 Completed:**
- [x] Created DocumentGroupCard component (sample display)
- [x] Created DocumentUploader component (file upload)
- [x] Updated SamplesTab in project detail page
- [x] Created upload page
- [x] Documented sample API routes in README

**Phase 3 Completed:**
- [x] Created DocumentViewer component (122 lines)
  - Text selection support for citations
  - Real-time feedback on selected text
  - Document content display with scrolling
  
- [x] Created CriteriaEvaluationForm component (260 lines)
  - Status dropdown with validation
  - Confidence slider (0-100%)
  - Explanation textarea
  - Citations list with add/remove
  - Visual completion indicator
  
- [x] Created evaluation page (403 lines)
  - Split-screen layout (doc left, forms right)
  - Progress tracking (7 of 10 evaluated = 70%)
  - Real-time text selection → citation flow
  - Batch save (atomic truth key creation)
  - Form validation (all criteria required)
  
- [x] Documented truth key API routes in README
  - GET evaluate endpoint (load doc + criteria)
  - POST truth-keys (batch UPSERT)
  - GET/PUT/DELETE truth key management

**Key Innovation:**
Truth keys created via web UI - analysts evaluate documents in browser, creating training data for AI optimization. As more docs manually evaluated, system learns and improves.

**Sprint 2 Progress:** 80% complete (4 of 5 phases)

**Next Steps (Phase 4):**
1. Implement optimization run orchestrator (backend logic)
2. Call module-eval to run AI evaluations
3. Compare AI results to truth keys
4. Calculate accuracy metrics (TP/TN/FP/FN)
5. Store results in eval_opt_runs tables

---

### February 5, 2026 9:21 AM - Phase 0 Complete (Database Schemas)

**Session Duration:** 2 hours 9 minutes  
**Session Goal:** Create module-eval-optimizer structure with idempotent database schemas

**Completed:**
- [x] Created complete module directory structure
- [x] Created module.config.yaml, module.json, README.md
- [x] Created 6 database schema files (001-006):
  - 001-eval-opt-projects.sql (projects, members, test orgs)
  - 002-eval-opt-doc-groups.sql (doc groups, group members)
  - 003-eval-opt-truth-keys.sql (truth keys)
  - 004-eval-opt-runs.sql (optimization runs, run results)
  - 005-eval-opt-prompt-versions.sql (prompt versions, deployments)
  - 006-eval-opt-rls.sql (all RLS policies)
- [x] Fixed all idempotency issues:
  - Wrapped all constraint additions in DO blocks with pg_constraint checks
  - Added DROP POLICY IF EXISTS before all CREATE POLICY statements
- [x] Tested all schemas - confirmed idempotent
- [x] Created infrastructure Terraform stubs
- [x] Updated context and plan files

**Next Steps (Phase 1):**
1. Create project management frontend UI (`app/projects/page.tsx`)
2. Implement project CRUD API routes
3. Build project creation form
4. Implement member management UI

---

### February 5, 2026 8:15 AM - Architecture Decision & Phase 0 Start

**Session Goal:** Update Sprint 2 plan with hybrid architecture decision and create module structure

**Architecture Decision:**
- [x] Reviewed existing module-eval structure
- [x] Reviewed AI Module Development Guide
- [x] Reviewed _module-template patterns
- [x] Decided on Hybrid Option B:
  - `module-eval-optimizer/` for backend/db/infrastructure
  - `apps/eval-optimizer/` for unique UI
  - Enables provisioning/enablement + API-first approach

**Phase 0 Implementation:**
- [ ] Create `module-eval-optimizer` directory structure
- [ ] Create `module.config.yaml`
- [ ] Create `module.json`
- [ ] Create `README.md`
- [ ] Create 7 database schema files
- [ ] Create RLS policies
- [ ] Create infrastructure Terraform stubs
- [ ] Create frontend stub

**Next Steps:**
1. Create module directory structure
2. Create configuration and metadata files
3. Create database schema files
4. Create infrastructure stubs

---

### February 5, 2026 7:28 AM - Sprint 2 Plan Created

**Session Goal:** Define Sprint 2 plan

**Completed:**
- [x] Created Sprint 2 plan document (initial version)
- [x] Defined 5 phases
- [x] Comprehensive database schema design

**Next Steps:**
1. Review architecture options
2. Update plan based on architecture decision

---

**Sprint 2 Status:** 📋 ACTIVE - Phase 4 Redesign Required  
**Branch:** `feature/eval-optimization-s2`  
**Target Completion:** 4-5 weeks (extended due to Phase 4 redesign)

---

## 🔄 PHASE 4 REDESIGN (CRITICAL DISCOVERY)

**Date:** February 5, 2026 PM  
**Status:** ⚠️ **ORIGINAL PHASE 4 SUPERSEDED** - Fundamental misunderstanding corrected

### Discovery Summary

Through user feedback, we discovered that the **original Phase 4 approach is fundamentally wrong**. The system should automatically generate and test prompts, not have BAs manually configure them.

**Original Phase 4 (WRONG):**
- ❌ BA manually writes prompts using PromptConfigForm
- ❌ BA manually configures temperature, max_tokens
- ❌ Generic prompts ("strict" vs "lenient")
- ❌ BA manually runs optimization
- ❌ BA manually iterates

**Correct Phase 4 (REDESIGNED):**
- ✅ BA uploads domain context documents (CJIS standards, appraisal guides, etc.)
- ✅ BA defines desired response structure (JSON builder UI)
- ✅ **SYSTEM automatically generates domain-aware prompts via RAG + LLM meta-prompting**
- ✅ SYSTEM tests 5-7 prompt variations automatically
- ✅ SYSTEM finds best configuration
- ✅ SYSTEM provides recommendations for improvement

### Why Domain-Aware Prompts Are Critical

Generic prompts don't work for specialized domains:
- **CJIS IT Security:** Must reference security controls, CJIS standards
- **Federal Appraisals:** Must reference valuation methods, comparables
- **FOIA Requests:** Must reference exemptions, redaction rules

### The New Approach: RAG + LLM Meta-Prompting

**"The Secret Sauce":**
1. **RAG Pipeline:** Extract domain knowledge from context documents
2. **LLM Meta-Prompter:** Generate prompts that reference domain standards
3. **Variation Generator:** Create 5-7 prompt variations (evidence-focused, standard-focused, risk-focused, etc.)
4. **Automated Testing:** System tests all variations automatically
5. **Recommendation Engine:** Suggest improvements ("Add 7 more truth sets for +10% accuracy")

### Redesigned Phase 4 Structure

**Phase 4A: Context Document Management (Week 1)**
- Upload domain standards/guides
- RAG extraction pipeline
- View extracted concepts

**Phase 4B: Response Structure Builder (Week 1-2)**
- Visual JSON builder UI
- Define sections: score_justification, compliance_gaps, recommendations
- Preview pane

**Phase 4C: Automated Optimization (Week 2-3)**
- LLM meta-prompter (generate domain-aware prompts)
- Variation generator (5-7 variations)
- Automated testing
- Recommendation engine

**Phase 4D: Testing & Refinement (Week 3)**
- End-to-end testing
- Validate RAG quality
- Validate prompt generation quality

### Implementation Details

**See comprehensive design document:**
📄 **`docs/specifications/spec_eval-optimizer-phase4-redesign.md`**

**Design document includes:**
- Complete architecture overview
- Database schema changes (2 new tables: eval_opt_context_docs, eval_opt_response_structures)
- 6 component specifications (Context Manager, Response Builder, RAG Pipeline, Meta-Prompter, Variation Generator, Recommendation Engine)
- Backend architecture with pseudocode
- API specifications
- 4 sub-phases over 3 weeks
- Success criteria
- Open questions (vector DB, embedding model, LLM choice)

### Files Created (Original Phase 4) - NOW DEPRECATED

**Status of originally implemented Phase 4 files:**
- `app/projects/[id]/runs/page.tsx` ⚠️ **Keep** (run list is still valid)
- `app/projects/[id]/runs/new/page.tsx` ⚠️ **REDESIGN** (remove manual prompt config, add thoroughness selector)
- `components/PromptConfigForm.tsx` ❌ **DELETE** (manual prompt editing not needed)
- `backend/OPTIMIZATION-ORCHESTRATOR.md` ⚠️ **UPDATE** (add RAG + meta-prompting logic)

### Updated Timeline

**Original Sprint 2 Timeline:** 2-3 weeks
**Updated with Redesign:** 4-5 weeks

**Weeks 1-1.5:** Phases 0-3 ✅ COMPLETE
**Weeks 2-4:** Phase 4 Redesign (4 sub-phases)
**Week 5:** Phase 5 (Results display)

### Next Steps

1. **Review design document** (`spec_eval-optimizer-phase4-redesign.md`)
2. **Clarify open questions** (vector DB selection, embedding model, LLM for meta-prompting)
3. **Begin Phase 4A implementation** (Context document management)
4. **Remove deprecated code** (PromptConfigForm component)

---

---

### February 5, 2026 Afternoon (4:40-4:48 PM) - Phase 4A Planning & Documentation Update

**Session Duration:** 8 minutes  
**Session Goal:** Assess current state, verify schemas, and update documentation

**Completed:**

1. **Current State Assessment:**
   - Reviewed all Phase 0-3 deliverables
   - Verified Phases 0-3 are 100% complete
   - Identified Phase 4A as next step

2. **Database Schema Verification:**
   - ✅ `eval_opt_response_structures` EXISTS in 004-eval-opt-prompt-versions.sql (Phase 4B ready)
   - ✅ `eval_opt_runs` has Phase 4 redesign fields (context_doc_ids, response_structure_id, generated_prompts)
   - ❌ `eval_opt_context_docs` DOES NOT EXIST (needs to be created in Phase 4A)

3. **Deprecated Code Identified:**
   - `components/PromptConfigForm.tsx` - Must be deleted (wrong approach)
   - `app/projects/[id]/runs/new/page.tsx` - Needs complete redesign (remove manual prompt config)

4. **Architectural Decision:**
   - UI still uses "projects" terminology (workspace_id in DB)
   - **Decision:** Keep "projects" as UI abstraction for now
   - Defer full UI terminology refactor to focus on Phase 4A implementation

5. **Documentation Updated:**
   - ✅ Updated context-eval-optimization.md with session log
   - ✅ Updated plan_eval-optimization-s2.md with current status
   - ✅ Updated progress tracker (Phases 0-3 complete)

**Phase 4A Ready to Start:**
- Part 1: Delete PromptConfigForm.tsx, redesign runs/new page
- Part 2: Create 006-eval-opt-context-docs.sql schema + RLS
- Part 3: Create context document manager UI
- Part 4: Update API README with Phase 4 endpoints

**Next Steps:**
1. Begin Part 1: Code cleanup (delete deprecated PromptConfigForm)
2. Begin Part 2: Create Phase 4A database schema
3. Begin Part 3: Create context document manager UI
4. Begin Part 4: Document Phase 4A APIs

---

### February 5, 2026 Afternoon (5:26-5:46 PM) - Database Naming Compliance Fix (ADR-011)

**Session Duration:** 20 minutes  
**Session Goal:** Fix database naming violations (workspace_id → ws_id per ADR-011)

**Critical Issue Discovered:**

All eval_opt schema files were created with `workspace_id` column name, violating ADR-011 database naming standards which require using the abbreviated form `ws_id` for foreign keys referencing the `workspaces` table.

**Work Completed:**

1. **Created Cleanup Migration**
   - ✅ Created `000-cleanup-non-compliant-tables.sql`
   - Drops all eval_opt tables created with workspace_id columns
   - Enables clean redeployment with compliant schemas

2. **Fixed All Schema Files (workspace_id → ws_id)**
   - ✅ 001-eval-opt-doc-groups.sql - Fixed column def, comment, composite index
   - ✅ 002-eval-opt-truth-keys.sql - No workspace_id references (already correct)
   - ✅ 003-eval-opt-runs.sql - Fixed column def, comment, 2 composite indexes
   - ✅ 004-eval-opt-prompt-versions.sql - Fixed column def, comment, indexes
   - ✅ 005-eval-opt-context-docs.sql - Fixed column def, comment, indexes
   - ✅ 006-eval-opt-rls.sql - Fixed all RLS policy WHERE clauses

3. **Successful Redeployment**
   - ✅ User ran cleanup migration (dropped non-compliant tables)
   - ✅ User ran all corrected schemas (001-006)
   - ✅ Verified 7 tables created successfully:
     - eval_opt_context_docs
     - eval_opt_doc_group_members
     - eval_opt_doc_groups
     - eval_opt_response_structures
     - eval_opt_run_results
     - eval_opt_runs
     - eval_opt_truth_keys

**Root Cause:**

Initial sed command only replaced `workspace_id UUID` in table definitions but missed:
- Column comments (`COMMENT ON COLUMN table.workspace_id IS ...`)
- Composite indexes (`ON table(workspace_id, status)`)
- Single-column index references

**ADR-011 Compliance:**

All tables now use `ws_id` for workspace foreign keys per ADR-011 database naming standards.

**Lesson Learned:**

Always review database naming standards (ADR-011) BEFORE creating any schemas. This mistake cost deployment time to cleanup and redeploy all tables.

**Phase 0 Status:** ✅ COMPLETE - All 7 tables deployed and ADR-011 compliant

---

## Next Steps for Phase 4A (Next Session)

**Phase 4A: Context Document Management**

1. **Delete Deprecated Code** (10 min)
   - Delete `components/PromptConfigForm.tsx` (wrong approach)
   - Update `app/projects/[id]/runs/new/page.tsx` (remove manual prompt config, add thoroughness selector)

2. **Create Context Document Manager UI** (1-2 hours)
   - Create `app/projects/[id]/context/page.tsx`
   - Create `components/ContextDocumentUploader.tsx`
   - Create `components/ContextDocumentList.tsx`
   - Document API endpoints in `app/api/README.md`

3. **Backend API Implementation** (2-3 hours)
   - Implement context document upload endpoint
   - Integrate with module-kb for document storage
   - RAG extraction pipeline (stub for now, full implementation in Phase 4C)

4. **Testing** (30 min)
   - Test document upload flow
   - Verify documents stored in KB
   - Test document list/delete operations

**Expected Duration:** 4-6 hours  
**Branch:** `feature/eval-optimization-s2`  
**Ready to Start:** ✅ All prerequisites complete (Phase 0-3 done, database deployed)

---

**Last Updated:** February 5, 2026 6:56 PM

---

### February 5, 2026 Evening (6:34-6:56 PM) - All UI Pages Complete

**Session Duration:** 22 minutes  
**Session Goal:** Create remaining UI pages and update API documentation

**Completed:**

1. **New UI Pages (4 pages)**
   - `app/ws/[wsId]/runs/page.tsx` - Runs list with status badges, accuracy display
   - `app/ws/[wsId]/evaluate/[groupId]/page.tsx` - Split-screen evaluation UI
   - `app/ws/[wsId]/samples/upload/page.tsx` - Sample document upload
   - `app/ws/[wsId]/response-structure/page.tsx` - JSON builder page

2. **New Component**
   - `components/ResponseStructureBuilder.tsx` - Visual JSON builder (425 lines)
   - Drag-to-reorder sections
   - Type badges (text/list/object/number/boolean)
   - Live JSON preview pane

3. **API Documentation**
   - Updated `app/api/README.md` with workspace-centric endpoints
   - Added thoroughness parameter documentation
   - Added response structure endpoints

**Total UI Pages Created This Sprint (9 pages):**
- `app/ws/page.tsx` - Workspace list
- `app/ws/new/page.tsx` - Create workspace
- `app/ws/[wsId]/page.tsx` - Workspace detail (6 tabs)
- `app/ws/[wsId]/context/page.tsx` - Context documents
- `app/ws/[wsId]/runs/page.tsx` - Runs list
- `app/ws/[wsId]/runs/new/page.tsx` - New run
- `app/ws/[wsId]/evaluate/[groupId]/page.tsx` - Evaluation UI
- `app/ws/[wsId]/samples/upload/page.tsx` - Sample upload
- `app/ws/[wsId]/response-structure/page.tsx` - JSON builder

**Sprint 2 UI Status:** ✅ COMPLETE - All frontend pages created

---

### February 5, 2026 Evening (7:00-7:53 PM) - Phase 4B-C Backend + Infrastructure Complete

**Session Duration:** 53 minutes  
**Session Goal:** Implement backend Lambda, Terraform infrastructure, and ADR-019c compliant module layer

**Phase 4B Completed - Backend Implementation:**

1. **Lambda Orchestrator (`opt-orchestrator/lambda_function.py`)**
   - ✅ ~850 lines of code
   - Routes: POST/GET/DELETE for optimization runs
   - Async worker for background processing
   - 5-phase optimization pipeline:
     - Phase 1: Domain knowledge extraction (RAG)
     - Phase 2: Prompt generation (meta-prompter)
     - Phase 3: Variation generation
     - Phase 4: Evaluation loop (compare to truth keys)
     - Phase 5: Recommendations

2. **Supporting Modules:**
   - ✅ `rag_pipeline.py` - Extract domain knowledge from context docs
   - ✅ `meta_prompter.py` - Generate domain-aware prompts via LLM
   - ✅ `variation_generator.py` - Create 5-12 prompt variations
   - ✅ `recommendation_engine.py` - Generate actionable insights
   - ✅ `requirements.txt` - Lambda dependencies

3. **Build Script:**
   - ✅ `backend/build.sh` - Package Lambda with dependencies

**Phase 4C Completed - Terraform Infrastructure:**

1. **Infrastructure Files:**
   - ✅ `main.tf` - Lambda function, IAM role, API Gateway routes, Lambda layer
   - ✅ `variables.tf` - Input variables including layer zip path
   - ✅ `outputs.tf` - Function ARN, layer ARN, route IDs
   - ✅ `versions.tf` - Terraform/provider version constraints

2. **API Routes Provisioned:**
   - `POST /api/workspaces/{wsId}/optimization/runs` - Start run
   - `GET /api/workspaces/{wsId}/optimization/runs` - List runs
   - `GET /api/workspaces/{wsId}/optimization/runs/{runId}` - Get run
   - `GET /api/workspaces/{wsId}/optimization/runs/{runId}/results` - Detailed results
   - `DELETE /api/workspaces/{wsId}/optimization/runs/{runId}` - Cancel/delete

**Phase 4C+ Completed - Module Layer (ADR-019c):**

1. **Layer Structure:**
   - ✅ `backend/layers/eval_opt_common/build.sh` - Layer build script
   - ✅ `backend/layers/eval_opt_common/python/eval_opt_common/__init__.py`
   - ✅ `backend/layers/eval_opt_common/python/eval_opt_common/permissions.py`

2. **Permission Functions (ADR-011 abbreviated names):**
   - `can_access_opt_ws()` - Check workspace membership
   - `can_access_opt_run()` - Check run access (owner or ws member)
   - `can_manage_opt_run()` - Check run management (owner or ws owner)
   - `is_opt_run_owner()` - Check run ownership
   - `can_access_opt_doc_group()` - Check document group access
   - `can_access_opt_truth_key()` - Check truth key access
   - `can_edit_opt_truth_key()` - Check truth key edit permission

3. **Lambda Updated to Use Layer:**
   - ✅ Imports permission functions from `eval_opt_common`
   - ✅ Removed duplicate `check_workspace_access()` function
   - ✅ Added run-level permission checks (ADR-019c compliant)

**Files Created This Session (15+ files):**
```
backend/
├── build.sh
├── lambdas/opt-orchestrator/
│   ├── lambda_function.py (~850 lines)
│   ├── rag_pipeline.py
│   ├── meta_prompter.py
│   ├── variation_generator.py
│   ├── recommendation_engine.py
│   └── requirements.txt
└── layers/eval_opt_common/
    ├── build.sh
    └── python/eval_opt_common/
        ├── __init__.py
        └── permissions.py

infrastructure/
├── main.tf (~240 lines)
├── variables.tf
├── outputs.tf
└── versions.tf
```

**Sprint 2 Status:** ✅ COMPLETE - All code merged to main

**Deferred to Sprint 3:**
1. Phase 4D: Integration testing (deploy and test end-to-end)
2. Phase 5: Results display & A/B comparison

**Why Defer?**
- Clean branch for integration testing allows fresh start with fixes
- All code is in place, ready for deployment and testing
- Sprint 3 can focus purely on validation and polish
