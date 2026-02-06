# Context: Evaluation Optimization Initiative

**Created:** February 4, 2026  
**Primary Focus:** Business Analyst Workbench for prompt optimization in module-eval

## Initiative Overview

The Evaluation Optimization initiative develops a **supplemental application** (companion to the main CORA app) that enables business analysts to optimize prompt configurations for document evaluation processing. The system uses sample-driven training with human-verified "truth keys" to tune prompts for specific document domains (IT security policies, appraisals, proposals, etc.), reducing false positives and false negatives in automated evaluations.

### 🚨 CRITICAL: RAG Architecture Constraint

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

### Target Users
- **Business Analysts** optimizing evaluation configurations for document domains
- **Not** end users performing document evaluations (different workflow, different UI needs)

### Core Problem
Currently, module-eval uses the same prompt for all document types, leading to suboptimal accuracy across different domains. This initiative creates a systematic approach to optimize prompts per domain using:
- Sample documents with human-verified evaluation results (truth keys)
- Statistical confidence metrics on optimization quality
- Guidance on sample size requirements for production readiness

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|-----------|--------------
| S1 | `feature/eval-optimization-s1` | `plan_eval-optimization-s1.md` | ✅ COMPLETE | All phases (Arch, Prototype, ConOps, ADR-021) |
| S2 | `feature/eval-optimization-s2` | `plan_eval-optimization-s2.md` | 🚧 IN PROGRESS | Phase 0 ✅, Phase 1 ✅ |

## Current Sprint

- **Sprint 1:** ✅ COMPLETE (Feb 5, 2026 AM)
- **Sprint 2:** ✅ COMPLETE (Feb 5, 2026)
- **Branch:** `feature/eval-optimization-s2`
- **Plan:** `docs/plans/plan_eval-optimization-s2.md`
- **Status:** All code merged to main - Ready for Sprint 3
- **Current Phase:** Sprint 2 COMPLETE
- **Duration:** 2.5 weeks
- **Progress:** 100% complete (Phase 4D/5 deferred to Sprint 3)
- **Next Session:** Sprint 3 - Integration testing + results display

## Key Design Decisions

### 1. Deployment Architecture (DECIDED - ADR-021)

**Status:** ✅ Complete - ADR-021 documents decision

**Decision:** Option A (Same Stack Repo at `{project}-stack/apps/eval-optimizer/`)

**Rationale:**
- ✅ Zero code duplication (imports from workspace packages)
- ✅ Shared authentication (same Cognito/NextAuth)
- ✅ Zero additional infrastructure cost
- ✅ Independent build/deploy pipeline (port 3001)
- ✅ Familiar monorepo patterns
- ✅ **Enables paid feature monetization** (Sprint 2 insight)

**Trade-offs:**
- ⚠️ Deployment coupling (mitigated by independent pipelines)
- ✅ Overall: Benefits outweigh costs

**Alternatives Rejected:**
- **Option B (Separate Repo):** High duplication cost, maintenance overhead
- **Option C (Toolkit Utility):** Not production-ready, wrong abstraction
- **Option D (Module-Eval Admin):** Prevents monetization as paid feature

**Strategic Rationale:**
- Open Source Core: module-eval (evaluation execution) - FREE
- Paid Enhancement: eval-optimizer (BA Workbench) - PAID ADD-ON
- Business Model: Sustainable funding while keeping CORA core open source

**Documentation:** See `docs/arch decisions/ADR-021-EVAL-OPTIMIZER-DEPLOYMENT.md`

### 2. Truth Key Versioning (DECIDED - Sprint 2)

**Status:** ✅ Complete - Sprint 2 planning

**Decision:** Version truth keys against specific doc_type + criteria_set combination

**Rationale:**
- Truth keys are only valid for specific doc_type + criteria_set
- If criteria change, old truth keys may not apply
- Need to track validity and invalidate when criteria updated

**Implementation:**
- `doc_type_id` captured at evaluation time
- `criteria_set_version` tracked
- `is_valid` flag to mark outdated truth keys
- `invalidation_reason` for audit trail

### 3. System-Level Configuration (DECIDED - Sprint 2) 🎯 **CRITICAL**

**Status:** ✅ Complete - Sprint 2 planning

**Decision:** Promote doc type + criteria set to system-level shared configurations

**Rationale:**
- **Efficiency:** BAs create truth sets once (not per-org)
- **Faster Onboarding:** Orgs inherit pre-configured, pre-optimized settings
- **Quality:** Centralized optimization benefits entire platform
- **Visibility:** Dashboard shows which combinations need work

**Implementation:**
- New tables: `eval_sys_doc_types`, `eval_sys_criteria_sets`, `eval_sys_criteria_items`
- Org adoption: `eval_org_adopted_configs` (inheritance model)
- Projects reference system-level configs (not org-level)
- BA Task Management Dashboard shows coverage gaps

**Benefits:**
- ✅ No duplicate manual evaluation work across orgs
- ✅ IT Security Policies + NIST optimized once, all orgs benefit
- ✅ New orgs: "Enable IT Security Policies (NIST)" → Done
- ✅ Consistent evaluation standards across platform

**Trade-offs:**
- ⚠️ Requires system admin privileges to create doc types
- ⚠️ Reduced org flexibility (but can customize if needed)
- ✅ Net Positive: Major efficiency gain outweighs trade-offs

### 2. Application Architecture (DECIDED)

**Type:** Standalone companion application (NOT admin feature in main app)

**Rationale:**
- Different user persona (analysts vs. end users)
- Different workflows (prompt tuning vs. document evaluation)
- UI optimized for iterative optimization cycles
- Can evolve independently without cluttering main app

**Authentication:** Uses same Cognito/NextAuth as main CORA app
- Single identity across both apps
- Leverage existing auth infrastructure

### 3. API Integration Scope (DECIDED)

The optimizer app calls APIs from **4 CORA modules**:

| Module | Purpose | Example Operations |
|--------|---------|-------------------|
| **module-access** | Org context management | Create test orgs for optimization runs |
| **module-ws** | Workspace container | Create workspaces for test documents |
| **module-kb** | Document management | Upload sample docs to knowledge base |
| **module-eval** | Evaluation execution | Run evaluations with different prompt configs |

**Org Management Strategy:** Create dedicated test orgs with naming convention `eval-opt-{domain}-{timestamp}` to:
- Isolate optimization data from production
- Allow cleanup after optimization runs
- Track experiments separately

## Core Workflow

```
1. Create Test Org (module-access)
      ↓
2. Create Workspace (module-ws)
      ↓
3. Upload Sample Document (module-kb)
      ↓
4. Define Truth Key (expected evaluation results)
      ↓
5. Configure Eval Prompt (prompt management - new feature)
      ↓
6. Run Evaluation (module-eval)
      ↓
7. Compare Results vs Truth Key (optimization logic - new feature)
      ↓
8. Analyze Confidence Metrics (sample coverage analysis - new feature)
      ↓
9. Iterate: Adjust prompt → Repeat steps 5-8
      ↓
10. Deploy Optimized Prompt (per domain configuration - new feature)
```

## Sample-Driven Optimization Concept

### Input Format
- **Sample Documents:** Real documents from target domain
- **Truth Keys:** Human analyst's evaluation results (the "correct" answers)
  - Compliance scores per criterion
  - Expected findings
  - Identified risks/issues

### Confidence & Sample Size Guidance

The system provides statistical guidance on result reliability based on sample size:

| Sample Size | Confidence Level | User Guidance |
|-------------|-----------------|---------------|
| 1 example | ⚠️ Very Low | "Single example cannot establish pattern. Results may not generalize." |
| 2-5 examples | 🟡 Low | "Limited samples. Add more diverse examples for reliable patterns." |
| 6-15 examples | 🟢 Moderate | "Reasonable coverage. Consider edge cases and variations." |
| 16+ examples | ✅ High | "Strong sample set. Prompt should generalize well to new documents." |

### Truth Key Format (DECIDED)

**Format:** Excel/CSV spreadsheet with two sheets
- **Sheet 1:** Document-level truth keys (overall compliance, key findings)
- **Sheet 2:** Criteria-level truth keys (per-criterion status, confidence, notes)

**Documentation:** See ConOps Section 4 for complete specification

## Key Features (Defined in ConOps)

### 1. Sample Coverage Analysis
- Track document variations in training set
- Identify gaps (e.g., "no examples with tables", "no multi-page docs")
- Suggest additional example types needed for robust optimization

### 2. Optimization Metrics Dashboard
- Accuracy vs truth keys (per criterion)
- False positive / false negative rates
- Precision and recall metrics
- Confidence intervals based on sample size
- Trend analysis across prompt iterations

### 3. Prompt Versioning & Comparison
- Track prompt iterations with metadata (author, date, description)
- A/B compare different prompt versions
- Show which version performs best on test set
- Rollback capability to previous versions

### 4. Domain Configuration Management
- Manage prompts per document domain:
  - IT Security Policies → Prompt A (optimized)
  - Appraisals → Prompt B (optimized)
  - Proposals → Prompt C (optimized)
  - FOIA Requests → Prompt D (optimized)
- Domain-specific evaluation criteria
- Import/export domain configurations

### 5. Batch Testing & Validation
- Run optimized prompt against entire sample set
- Cross-validation across sample partitions
- Performance degradation detection
- Regression testing when prompt changes

## Technical Architecture

### Frontend
- Next.js application (consistent with CORA stack pattern)
- TypeScript + React
- Shared UI library components from main app (workspace packages)
- Analyst-focused UX: iterative workflows, data visualization

### Backend
- API Gateway → Lambda (consistent with CORA pattern)
- Leverages existing CORA module APIs
- New optimizer-specific APIs for:
  - Truth key management
  - Prompt versioning
  - Optimization metrics calculation
  - Sample coverage analysis

### Data Storage
- Supabase/PostgreSQL (consistent with CORA)
- New tables (namespaced `eval_opt_*`):
  - `eval_optimization_projects`
  - `eval_opt_project_members`
  - `eval_opt_document_groups`
  - `eval_opt_truth_keys`
  - `eval_prompt_versions`
  - `eval_opt_runs`
  - `eval_opt_run_results`

**Database Schema:** See ConOps Section 10 for complete schema

## Success Criteria

### Sprint 1 (Architecture Analysis) ✅ COMPLETE
- [x] ✅ ADR-021 created documenting deployment architecture decision
- [x] ✅ Minimal prototype proves:
  - [x] Auth works (same Cognito/NextAuth as main app)
  - [x] Can call module-access, ws, kb, eval APIs
  - [x] Can create org, workspace, upload doc, run eval
- [x] ✅ Recommendation documented with pros/cons of each option
- [x] ✅ ConOps document for optimization methodology
- [x] ✅ Sprint 2 implementation plan

### Overall Initiative (Multi-Sprint)
- [ ] Business analysts can upload sample docs with truth keys
- [ ] System optimizes prompts per document domain
- [ ] Confidence metrics guide analysts on sample size needs
- [ ] Optimized prompts improve eval accuracy (measurable reduction in false positives/negatives)
- [ ] Domain-specific prompt configurations deployed to production module-eval

## Key Decisions & ADRs

- **ADR-021 (Accepted):** Eval Optimizer Deployment Architecture
  - Documents deployment decision: Option A (Same Stack Repo)
  - Created: February 5, 2026
  - Location: `docs/arch decisions/ADR-021-EVAL-OPTIMIZER-DEPLOYMENT.md`

## Session Log

### February 5, 2026 Morning (10:00 AM) - Sprint 2 Phase 2 & 3 Complete

**Session Duration:** 1 hour 12 minutes  
**Branch:** `feature/eval-optimization-s2`  
**Objective:** Implement sample document management and manual evaluation UI

**Phase 2 Completed:**

1. **Sample Document Management**
   - ✅ Updated `app/projects/[id]/page.tsx` - Added Samples tab
   - ✅ Created `components/DocumentGroupCard.tsx` (200+ lines)
   - ✅ Created `components/DocumentUploader.tsx` (150+ lines)
   - ✅ Created `app/projects/[id]/samples/upload/page.tsx` (300+ lines)
   - ✅ Updated API README with sample management routes

2. **API Documentation Extended**
   - ✅ `GET /api/projects/{id}/samples` - List samples
   - ✅ `POST /api/projects/{id}/samples/upload` - Upload with module-kb integration
   - ✅ `GET /api/projects/{id}/samples/{group_id}` - Get document group
   - ✅ `DELETE /api/projects/{id}/samples/{group_id}` - Delete sample

**Phase 3 Completed:**

1. **Manual Evaluation UI - Truth Key Creation**
   - ✅ Created `components/DocumentViewer.tsx` (122 lines)
     - Document content display with text selection
     - Real-time selected text feedback
     - Citation-ready UX
   
   - ✅ Created `components/CriteriaEvaluationForm.tsx` (260 lines)
     - Status dropdown (Compliant, Non-compliant, etc.)
     - Confidence slider (0-100%)
     - Explanation textarea
     - Citations list with add/remove
     - Visual completion indicator
   
   - ✅ Created `app/projects/[id]/evaluate/[group_id]/page.tsx` (403 lines)
     - Split-screen layout (document left, criteria right)
     - Progress tracking (e.g., "7 of 10 criteria evaluated - 70%")
     - Real-time text selection → citation flow
     - Batch save (all criteria in one transaction)
     - Form validation (must complete all criteria)

2. **API Documentation Extended**
   - ✅ `GET /api/projects/{id}/samples/{group_id}/evaluate` - Load doc + criteria
   - ✅ `POST /api/projects/{id}/truth-keys` - Save evaluations (batch UPSERT)
   - ✅ `GET /api/projects/{id}/truth-keys` - List truth keys
   - ✅ `PUT /api/projects/{id}/truth-keys/{id}` - Update single truth key
   - ✅ `DELETE /api/projects/{id}/truth-keys/{id}` - Delete truth key

**Key Innovation:**
- Truth keys created via web UI (not Excel upload)
- Analysts read document while evaluating criteria in parallel
- Text selection → citation flow is seamless
- Progress bar shows completion (visual feedback)
- Batch save ensures atomic truth key creation

**Phase 2 & 3 Complete:**
- ✅ All frontend UI components created (7 new files)
- ✅ API routes documented (backend implementation pending)
- ✅ Follows CORA patterns (ADR-004: NextAuth API Client Pattern)
- ✅ Split-screen evaluation UX (critical user experience)

**Next Session:**
- Phase 4: Optimization run backend logic
- Start with: Orchestrator to call module-eval and compare results to truth keys

---

### February 5, 2026 Morning (9:33 AM) - Sprint 2 Phase 1 Complete

**Session Duration:** 1 hour 12 minutes  
**Branch:** `feature/eval-optimization-s2`  
**Objective:** Create project management UI for the BA Workbench

**Completed:**

1. **Project List Page**
   - ✅ Created `app/projects/page.tsx` (276 lines)
   - ✅ Displays all optimization projects user has access to
   - ✅ Project cards with metadata (name, domain, samples, accuracy)
   - ✅ Create new project button
   - ✅ Role-based display (owner/admin/user badges)
   - ✅ Empty state with call-to-action

2. **Project Creation Form**
   - ✅ Created `app/projects/new/page.tsx` (408 lines)
   - ✅ Form with project name, description, domain fields
   - ✅ Doc type selector (loads from module-eval API)
   - ✅ Criteria set selector (loads from module-eval API)
   - ✅ Form validation and error handling
   - ✅ Info box about doc type + criteria set immutability

3. **Project Detail Page**
   - ✅ Created `app/projects/[id]/page.tsx` (770 lines)
   - ✅ Project header with stats summary (samples, evaluations, accuracy)
   - ✅ Tab navigation (Overview, Samples, Evaluations, Runs, Members)
   - ✅ Overview tab with configuration and activity cards
   - ✅ Members tab with full member management UI:
     - Add member form (email + role selection)
     - Member list with role badges
     - Remove member functionality (owner/admin only)
     - Permission checks (can't remove last owner)
   - ✅ Placeholder tabs for future phases (Samples, Evaluations, Runs)

4. **API Routes Documentation**
   - ✅ Created `app/api/README.md` (comprehensive spec)
   - ✅ Documented all project CRUD endpoints
   - ✅ Documented member management endpoints
   - ✅ Included database queries and authorization rules
   - ✅ Specified request/response formats

5. **Reusable Components**
   - ✅ ProjectCard component (embedded in project list)
   - ✅ ProjectMembers component (MembersTab in project detail)
   - ✅ Helper functions (getRoleColor, formatDate)

**Phase 1 Complete:**
- ✅ All frontend UI pages created
- ✅ API routes documented (backend implementation pending)
- ✅ Follows CORA patterns (ADR-004: NextAuth API Client Pattern)
- ✅ Consistent with Sprint 1 prototype patterns

**Next Session:**
- Phase 2: Sample document management (upload, list, delete)
- Start with: `app/projects/[id]/samples/page.tsx`

---

### February 5, 2026 Morning (9:21 AM) - Sprint 2 Phase 0 Complete

**Session Duration:** 2 hours 9 minutes  
**Branch:** `feature/eval-optimization-s2`  
**Objective:** Create module-eval-optimizer structure with idempotent database schemas

**Completed:**

1. **Module Structure Created**
   - ✅ Created complete module directory structure
   - ✅ Created module.config.yaml, module.json, README.md
   - ✅ Created infrastructure Terraform stubs (main.tf, variables.tf, outputs.tf, versions.tf)
   - ✅ Created frontend stub (index.ts)

2. **Database Schemas Created (6 files)**
   - ✅ 001-eval-opt-projects.sql (projects, members, test orgs)
   - ✅ 002-eval-opt-doc-groups.sql (doc groups, group members)
   - ✅ 003-eval-opt-truth-keys.sql (truth keys)
   - ✅ 004-eval-opt-runs.sql (optimization runs, run results)
   - ✅ 005-eval-opt-prompt-versions.sql (prompt versions, deployments)
   - ✅ 006-eval-opt-rls.sql (all RLS policies)

3. **Idempotency Fixes Applied**
   - ✅ Fixed RLS column references (person_id → user_id, removed 'active')
   - ✅ Restructured files to follow pattern (tables → RLS in final file)
   - ✅ Made all constraint additions idempotent (DO blocks with pg_constraint check)
   - ✅ Made all RLS policies idempotent (DROP POLICY IF EXISTS before CREATE)
   - ✅ All 6 files tested and confirmed idempotent

4. **Schema Pattern Compliance**
   - ✅ Tables in separate files (001-005)
   - ✅ RLS policies in final file (006)
   - ✅ All operations can be run multiple times without errors

**Database Schema:**
- 10 tables created with complete RLS policies
- All tables follow naming conventions (eval_opt_* prefix)
- Hybrid abbreviation pattern (readable table names, abbreviated foreign keys)

---

### February 5, 2026 Morning (7:12-7:55 AM) - Sprint 2 Planning Complete

**Session Duration:** 43 minutes  
**Branch:** `feature/eval-optimization-s2`  
**Objective:** Define Sprint 2 plan and establish architectural foundations

**Completed:**

1. **Documentation Cleanup**
   - ✅ Updated `plan_eval-optimization.md` - Marked 406/RLS errors as RESOLVED
   - ✅ Updated status: "Evaluation Accuracy Optimization" (not troubleshooting)
   - ✅ Clarified current focus: Pipeline works, results need optimization

2. **Sprint 2 Plan Created**
   - ✅ Created `docs/plans/plan_eval-optimization-s2.md`
   - ✅ Comprehensive 5-phase implementation plan (2-3 weeks)
   - ✅ Database schema designed for all tables
   - ✅ Frontend/backend components specified
   - ✅ Success criteria defined

3. **Critical Architectural Decisions**

   **Decision 1: Truth Key Versioning**
   - ✅ Truth keys must be versioned against specific doc_type + criteria_set
   - ✅ Added `doc_type_id`, `criteria_set_version`, `is_valid` fields
   - ✅ Enables invalidation when criteria change

   **Decision 2: System-Level Configuration** 🎯 **CRITICAL**
   - ✅ Promoted doc types and criteria sets to system-level
   - ✅ Created `eval_sys_doc_types`, `eval_sys_criteria_sets` tables
   - ✅ Orgs inherit pre-configured combinations via `eval_org_adopted_configs`
   - ✅ BAs create truth sets once (not per-org) - Major efficiency gain
   - ✅ Added BA Task Management Dashboard specification

   **Decision 3: Strategic Business Rationale** 💰
   - ✅ Confirmed separate app architecture enables paid feature monetization
   - ✅ Open Source Core: module-eval (evaluation execution) - FREE
   - ✅ Paid Enhancement: eval-optimizer (BA Workbench) - PAID ADD-ON
   - ✅ Mirrors successful models: GitLab, Elastic, MongoDB

4. **ADR-021 Updated**
   - ✅ Added Sprint 2 Addendum: System-level configuration architecture
   - ✅ Added Alternative 4: Module-eval admin feature (rejected for monetization)
   - ✅ Added Strategic Business Rationale section
   - ✅ Documented open source + paid add-on model

**Key Innovation:**
- Truth keys created via web UI (not Excel upload)
- Analyst evaluates document in browser → Creates truth key records
- As more docs manually evaluated, AI optimization improves over time

**Sprint 2 Ready:**
- ✅ Comprehensive plan document created
- ✅ Database schema designed (system-level and optimizer tables)
- ✅ Frontend components specified (5 phases)
- ✅ Success criteria defined
- ✅ Architecture decisions documented
- ✅ Next session can start implementation (Phase 1: Database migrations)

**Next Steps:**
1. Create database migrations for Sprint 2 tables
2. Implement Phase 1: Project management UI
3. Implement Phase 2: Sample document upload
4. Implement Phase 3: Manual evaluation UI (truth key creation)
5. Implement Phase 4: Optimization run backend
6. Implement Phase 5: Results display and A/B comparison

---

### February 5, 2026 Morning (Earlier) - Sprint 1 Complete

**Session Duration:** 30 minutes  
**Branch:** `feature/eval-optimization-s1`

**Completed:**
- ✅ **Phase 3: Option Evaluation**
  - Analyzed deployment options A/B/C
  - Filled decision matrix with prototype findings
  - Confirmed Option A (Same Stack Repo) as best choice
  
- ✅ **Phase 4: Decision & Documentation**
  - Created ADR-021: Eval Optimizer Deployment Architecture
  - Documented architecture decision with clear rationale
  - Updated Sprint 1 plan to mark all phases complete
  - Created Sprint 2 implementation roadmap

**Architecture Decision:**
- **Selected:** Option A (Same Stack Repo at `apps/eval-optimizer/`)
- **Rationale:** Zero code duplication, shared authentication, minimal infrastructure
- **Evidence:** Prototype validated all key integration points
- **Documentation:** ADR-021 provides comprehensive analysis

**Sprint 1 Outcomes:**
- All deliverables complete (architecture research, prototype, ConOps, ADR-021)
- Clear path forward for Sprint 2 implementation
- Technical decisions resolved (auth, API client, database, deployment)
- Risk mitigation strategies identified

### February 4, 2026 Evening - ConOps Development Complete
**Session Duration:** 1.5 hours  
**Branch:** `feature/eval-optimization-s1`

**Completed:**
- ✅ **Concept of Operations Document Created**
  - Created `docs/specifications/spec_eval-optimization-conops.md`
  - Comprehensive 13-section document (15,000+ words)
  - Captured all requirements from user discussions
  
**ConOps Document Includes:**
1. **Executive Summary** - Value proposition and target users
2. **Core Concepts** - Document domains, truth keys, optimization runs, document groups
3. **Sample-Driven Optimization Theory** - Statistical foundation, iteration model, multi-model support
4. **Analyst Workflow** - 6-phase workflow from project setup to production deployment
5. **Truth Key Specification** - Spreadsheet format, validation rules, import process
6. **Prompt Version Management** - Database-driven versioning, A/B comparison, rollback
7. **Quality Metrics** - Accuracy, precision/recall, F1, error analysis, confidence calibration
8. **Scalability Design** - Scale tiers (1-1000+ samples), processing architecture, cost estimation
9. **Access Control Model** - Owner/Admin/User roles aligned with CORA standards
10. **Production Deployment** - Workflow, deployment options, validation, monitoring
11. **Database Schema** - Complete schema for all optimization tables
12. **Success Criteria** - System-level, business outcomes, technical performance
13. **Implementation Roadmap** - Sprint 2-5 breakdown

**Key Requirements Captured:**
- ✅ Spreadsheet-based truth key upload (user requirement)
- ✅ Document group support (policy + proof artifacts)
- ✅ Multi-model optimization (GPT-4, Claude, Nova, etc.)
- ✅ Configuration parameter optimization (temperature, max_tokens, etc.)
- ✅ Version management for prompts (deployment workflow)
- ✅ Owner/Admin/User access control (CORA standard)
- ✅ Sample size guidance (1 to 1000s of truth keys)
- ✅ Statistical confidence metrics

### February 4, 2026 PM - Phase 1 & 2 Complete
**Session Duration:** 3 hours  
**Branch:** `feature/eval-optimization-s1`

**Completed:**
- ✅ **Phase 1: Architecture Research**
  - Reviewed ADR-004 (NextAuth API Client Pattern), ADR-007 (CORA Auth Shell), ADR-019 (Auth Standardization)
  - Analyzed module-eval prompt configuration flow (database → resolution → AI provider)
  - Documented code reuse opportunities (auth, API client, types)
  - Identified infrastructure requirements per deployment option
  
- ✅ **Phase 2: Prototype Development**
  - Created Option A prototype in `templates/_project-stack-template/apps/eval-optimizer/`
  - Built 10 files (887 lines): package.json, auth.ts, middleware.ts, app pages, API client
  - Proved shared authentication (same Okta/Cognito config)
  - Proved code reuse (imports from workspace packages)
  - Proved API integration (factory pattern, ADR-004 compliance)
  - Documented prototype in comprehensive README.md

**Findings:**
- Option A (Same Stack Repo) is viable and demonstrates strong advantages:
  - ✅ Zero code duplication
  - ✅ Shared authentication (single Cognito user pool)
  - ✅ Direct imports from workspace packages
  - ✅ Zero additional infrastructure
  - ✅ Independent build/deploy pipeline

### February 4, 2026 AM - Initiative Creation
- Defined initiative scope: standalone companion app for prompt optimization
- Identified need for architecture analysis in Sprint 1 before committing to deployment model
- Clarified API scope: module-access, ws, kb, eval
- Established sample-driven optimization concept with confidence metrics
- Documented truth key approach and statistical guidance requirements

## Related Initiatives

- **Module-Eval Development** (`context-module-eval.md`) - P2/P3 priority
  - This initiative complements eval development by providing optimization tooling
  - Not blocked by citations/scoring work - can prototype against existing APIs

## Priority & Work Lane

- **Priority:** P2-P3 (supports eval delivery but independent)
- **Lane:** H (AI Platform) - prompt engineering infrastructure
- **Dependencies:** None (can prototype against existing CORA APIs)
- **Conflict Risk:** Low (mostly new files, minimal overlap with other work)

## Sprint 1 Summary

**Status:** ✅ COMPLETE (February 5, 2026)

**All Deliverables Complete:**
- ✅ Phase 1: Architecture Research
- ✅ Phase 2: Prototype Development (Option A validated)
- ✅ ConOps: Comprehensive specification (13 sections)
- ✅ Phase 3: Option Evaluation (A/B/C comparison)
- ✅ Phase 4: ADR-021 + Sprint 2 roadmap

**Architecture Decision:** Option A (Same Stack Repo)

**Next:** Sprint 2 implementation pending team capacity and prioritization

---

## Sprint 2 Progress Tracker

| Phase | Status | Deliverables | Completion |
|-------|--------|--------------|------------|
| Phase 0 | ✅ COMPLETE | Module structure, database schemas (7 tables), RLS policies | 100% |
| Phase 1 | ✅ COMPLETE | Workspace management UI (refactored from projects) | 100% |
| Phase 2 | ✅ COMPLETE | Sample document management (upload, list, delete) | 100% |
| Phase 3 | ✅ COMPLETE | Manual evaluation UI (truth key creation) | 100% |
| Phase 4A | ✅ COMPLETE | Route refactoring + Context tab UI | 100% |
| Phase 4A+ | ✅ COMPLETE | All remaining UI pages + ResponseStructureBuilder | 100% |
| Phase 4B | ✅ COMPLETE | Backend Lambda + supporting modules | 100% |
| Phase 4C | ✅ COMPLETE | Terraform infrastructure + Lambda layer | 100% |
| Phase 4D | 📋 NEXT | Integration testing | 0% |
| Phase 5 | 📋 PLANNED | Results display & A/B comparison | 0% |

**Overall Sprint 2 Progress:** ✅ COMPLETE - Merged to main (Phase 4D/5 deferred to Sprint 3)

---

## Phase 4 Redesign Discovery (CRITICAL)

**Date:** February 5, 2026 PM  
**Status:** 🔄 MAJOR PIVOT - Original Phase 4 implementation is fundamentally wrong

### The Fundamental Misunderstanding

**What was initially implemented (WRONG):**
- BA manually writes prompts using PromptConfigForm
- BA manually configures temperature, max_tokens
- BA manually runs optimization with their prompts
- BA manually iterates on prompt configurations

**Correct product vision (discovered through user feedback):**
- BA creates truth keys (manual evaluation of sample documents) ✅ Correct
- BA uploads domain context documents (NEW)
- BA defines desired response structure (NEW)
- **SYSTEM automatically generates and tests prompts** (THE SECRET SAUCE)
- SYSTEM finds best configuration automatically
- SYSTEM provides recommendations for improvement

### Why Domain-Aware Prompt Generation is Critical

Generic prompts ("be strict", "be lenient") don't work for specialized domains:

- **CJIS IT Security Audits:** Must reference security controls, CJIS standards, evidence requirements
- **Federal Appraisals:** Must reference valuation methods, comparables, market analysis  
- **FOIA Requests:** Must reference exemptions, redaction rules, public interest

The system must understand the domain context and generate contextually appropriate prompts.

### The New Approach: RAG + LLM Meta-Prompting

**Workflow:**
```
1. BA uploads context documents (CJIS requirements, appraisal guides, etc.)
   ↓
2. System performs RAG on context docs
   - Extract key concepts, standards, terminology
   - Build domain knowledge base
   ↓
3. BA defines response structure (JSON builder UI)
   - score_justification
   - compliance_gaps
   - recommendations
   ↓
4. BA clicks "Start Optimization"
   ↓
5. System generates 5-7 domain-aware prompts via LLM
   - Uses RAG knowledge
   - References domain standards
   - Produces structured JSON
   - Variations: evidence-focused, standard-focused, risk-focused, etc.
   ↓
6. System tests all variations automatically
   - Runs module-eval for each prompt
   - Compares AI results to truth keys
   - Calculates accuracy metrics
   ↓
7. System shows best configuration + recommendations
   - "Add 7 more truth sets for +10% accuracy"
   - "Run refinement optimization"
   - "High false positives - try stricter prompts"
```

### What Needs to Be Built

**New Components:**
1. **Context Document Manager** - Upload domain standards, view RAG extraction
2. **Response Structure Builder** - Visual JSON builder for output format
3. **RAG Pipeline** - Extract domain knowledge from context docs
4. **LLM Meta-Prompter** - Generate domain-aware prompts automatically
5. **Variation Generator** - Create 5-7 prompt variations per iteration
6. **Recommendation Engine** - Analyze results and suggest improvements

**New Database Tables:**
- `eval_opt_context_docs` - Domain documents with RAG metadata
- `eval_opt_response_structures` - BA-defined JSON output formats

**Updated Tables:**
- `eval_opt_runs` - Add context_doc_ids, response_structure_id, generated_prompts

### Design Document

**Location:** `docs/specifications/spec_eval-optimizer-phase4-redesign.md`

**Sections:**
- Problem statement & vision
- Complete architecture overview
- Database schema changes
- Component specifications (6 components with detailed specs)
- Backend architecture (RAG, meta-prompting, pseudocode)
- API specifications
- Implementation phases (4 sub-phases, 3 weeks)
- Success criteria
- Open questions (vector DB, embedding model, LLM choice)

### Implementation Timeline

**Phase 4A:** Context Document Management (Week 1)
**Phase 4B:** Response Structure Builder (Week 1-2)
**Phase 4C:** Automated Optimization (Week 2-3)
**Phase 4D:** Testing & Refinement (Week 3)

**Total:** 3 weeks (vs original 1 week estimate)

### Original Phase 4 Code Status

**Created files (NOW DEPRECATED):**
- `app/projects/[id]/runs/page.tsx` ⚠️ Needs update (remove manual config)
- `app/projects/[id]/runs/new/page.tsx` ⚠️ Needs complete redesign
- `components/PromptConfigForm.tsx` ❌ DELETE (manual prompt editing)
- `backend/OPTIMIZATION-ORCHESTRATOR.md` ⚠️ Update to include RAG + meta-prompting

These files were built on the wrong assumption (manual prompt configuration) and need to be replaced/updated per the redesign.

---

## Next Steps (Phase 4 Redesign)

**Phase 4A: Context Document Management**
- [ ] Create eval_opt_context_docs table
- [ ] Build context document upload UI
- [ ] Implement RAG extraction pipeline
- [ ] Display extracted concepts

**Phase 4B: Response Structure Builder**
- [ ] Create eval_opt_response_structures table  
- [ ] Build visual JSON builder UI
- [ ] Preview pane for response format

**Phase 4C: Automated Optimization**
- [ ] Implement LLM meta-prompter
- [ ] Build variation generator
- [ ] Update orchestrator for RAG + meta-prompting
- [ ] Simplify optimization config UI (remove manual prompt fields)
- [ ] Build recommendation engine

**Phase 4D: Testing**
- [ ] End-to-end testing with real domain docs
- [ ] Validate RAG extraction quality
- [ ] Validate prompt generation quality

---

### February 5, 2026 Afternoon (4:11-4:28 PM) - Workspace-Centric Schema Refactoring

**Session Duration:** 17 minutes  
**Branch:** `feature/eval-optimization-s1` (will transition to s2)  
**Objective:** Refactor database schemas from project-based to workspace-based design

**Critical Architectural Change:**

Through user feedback, we discovered that the "optimization project" abstraction was over-engineered. The workspace itself should be the optimization container, not a separate project entity.

**Decision:** Remove `eval_optimization_projects` and use workspace as the container

**Rationale:**
- Workspace already provides the container concept
- Workspace members already provide access control
- No need for duplicate project/member tables
- Simpler, follows existing CORA patterns
- Context docs live in workspace KB (using existing module-kb)

**Schema Refactoring Completed:**

1. **Tables Removed:**
   - `eval_opt_projects` → Use workspace instead
   - `eval_opt_proj_members` → Use workspace_members
   - `eval_opt_test_orgs` → Not needed

2. **Tables Refactored (proj_id → workspace_id):**
   - `eval_opt_doc_groups` - Changed to workspace_id
   - `eval_opt_runs` - Changed to workspace_id, added Phase 4 fields (context_doc_ids, response_structure_id, generated_prompts)
   - `eval_opt_response_structures` - Replaced prompt_versions table, tied to workspace_id

3. **Tables Unchanged:**
   - `eval_opt_doc_group_members` - References doc_groups (indirect workspace ref)
   - `eval_opt_truth_keys` - References doc_groups (indirect workspace ref)
   - `eval_opt_run_results` - References runs (indirect workspace ref)

4. **RLS Policies Updated:**
   - All policies now check `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())`
   - Replaced project membership checks with workspace membership checks

**New Schema Files (5 total):**
- `001-eval-opt-doc-groups.sql` - Document groups + members
- `002-eval-opt-truth-keys.sql` - Truth keys for training data
- `003-eval-opt-runs.sql` - Optimization runs + results
- `004-eval-opt-prompt-versions.sql` - Response structures (not prompt versions)
- `005-eval-opt-rls.sql` - All RLS policies

**Archived Files (3 total in db/archived/):**
- `004-eval-opt-runs.sql` (old version with proj_id)
- `005-eval-opt-prompt-versions.sql` (old version with proj_id)
- `006-eval-opt-rls.sql` (old version with project membership)

**Note:** Files 001-003 from Phase 0 were created earlier today and overwritten without being archived (they never existed in git).

**Key Insights:**
- **Context documents** are just KB documents in the workspace (no separate table needed)
- **RAG functionality** provided by existing module-kb APIs
- **Embeddings** provided by existing module-ai APIs
- **Access control** provided by existing workspace_members table

**Next Steps:**
1. Update plan_eval-optimization-s2.md to reflect workspace-centric design
2. Update Phase 1-3 UI code to use workspaces instead of projects
3. Update API documentation to reference workspaces
4. Proceed with Phase 4 implementation (RAG + meta-prompting)

---

---

### February 5, 2026 Afternoon (4:40-4:46 PM) - Phase 4A Planning Session

**Session Duration:** 6 minutes  
**Branch:** `feature/eval-optimization-s2`  
**Objective:** Assess current state and plan Phase 4A implementation

**Findings:**

1. **Database Schema Status Verified:**
   - ✅ `eval_opt_response_structures` EXISTS in 004-eval-opt-prompt-versions.sql (Phase 4B schema complete)
   - ✅ `eval_opt_runs` has Phase 4 redesign fields (context_doc_ids, response_structure_id, generated_prompts)
   - ❌ `eval_opt_context_docs` DOES NOT EXIST (needs to be created for Phase 4A)

2. **Deprecated Code Identified:**
   - `components/PromptConfigForm.tsx` - Manual prompt editing component (WRONG approach, must be deleted)
   - `app/projects/[id]/runs/new/page.tsx` - Uses manual prompt config (needs complete redesign)
   
3. **UI Refactoring Decision:**
   - Phase 1-3 UI still uses "projects" terminology
   - Database uses workspace_id correctly
   - **Decision:** Defer full UI terminology refactor, keep "projects" as UI abstraction for now
   - Rationale: Keeps session focused on Phase 4A implementation

**Session Plan Created:**
- Part 1: Update documentation (this session)
- Part 2: Delete PromptConfigForm.tsx, redesign runs/new with thoroughness selector
- Part 3: Create 006-eval-opt-context-docs.sql schema + update RLS
- Part 4: Create context document manager UI + update API README

**Next Steps:**
- Update context and plan files ✅
- Begin Part 2: Code cleanup
- Begin Part 3: Phase 4A schema creation
- Begin Part 4: Phase 4A UI scaffolding

---

### February 5, 2026 Afternoon (5:26-5:46 PM) - Database Naming Compliance Fix (ADR-011)

**Session Duration:** 20 minutes  
**Branch:** `feature/eval-optimization-s2`  
**Objective:** Fix database naming violations (workspace_id → ws_id per ADR-011)

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

**Fix Applied:**

Multiple sed commands to replace all occurrences:
- Table column definitions
- Column comments
- Index definitions (single and composite)
- RLS policy conditions

**Verification:**

```sql
-- Confirmed 4 tables with ws_id foreign keys:
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name LIKE 'eval_opt_%' AND column_name = 'ws_id';

-- eval_opt_context_docs.ws_id ✅
-- eval_opt_doc_groups.ws_id ✅
-- eval_opt_response_structures.ws_id ✅
-- eval_opt_runs.ws_id ✅

-- Confirmed 0 workspace_id columns remain:
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name LIKE 'eval_opt_%' AND column_name = 'workspace_id';
-- (No results) ✅
```

**ADR-011 Compliance Rule:**

> When the related table uses an abbreviated prefix (as documented in Table Naming Rule 6), the foreign key column MUST use that same abbreviation, NOT the spelled-out form.

| Related Table | Foreign Key Column | NOT This ❌ |
|---------------|-------------------|-------------|
| `workspaces` | `ws_id` | `workspace_id` |

**Lesson Learned:**

Always review database naming standards (ADR-011) BEFORE creating any schemas. This mistake cost deployment time to cleanup and redeploy all tables.

**Next Session:**

- Phase 4A: Context Document Management UI implementation
- Phase 4B-D: Response Structure Builder + RAG Pipeline + Automated Optimization

---

**Document Status:** ✅ Sprint 1 Complete, 🚧 Sprint 2 In Progress (Phase 4B-C Complete)  
**Last Updated:** February 5, 2026 7:53 PM

---

### February 5, 2026 Evening (7:00-7:53 PM) - Phase 4B-C Backend + Infrastructure Complete

**Session Duration:** 53 minutes  
**Branch:** `feature/eval-optimization-s2`  
**Objective:** Implement backend Lambda, Terraform infrastructure, and ADR-019c compliant module layer

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

**Key Decisions:**
- Function naming follows ADR-011 abbreviations (ws, opt, doc)
- Lambda layer added to Terraform with `create_before_destroy` lifecycle
- Lambda uses both org-common layer AND eval_opt_common layer

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

**Sprint 2 Progress:** 95% complete (Phase 4B-C done, Phase 4D-5 remaining)

**Next Steps:**
1. Phase 4D: Integration testing (deploy and test end-to-end)
2. Phase 5: Results display & A/B comparison

---

### February 5, 2026 Evening (6:34-6:56 PM) - Remaining UI Pages + API Docs Complete

**Session Duration:** 22 minutes  
**Branch:** `feature/eval-optimization-s2`  
**Objective:** Create remaining UI pages and update API documentation

**Completed:**

1. **Runs List Page (`app/ws/[wsId]/runs/page.tsx`)**
   - List of optimization runs with status badges
   - Run cards showing accuracy, samples, criteria counts
   - Progress indicators for running jobs
   - Thoroughness badge (Fast/Balanced/Thorough)
   - Duration formatting for completed runs

2. **Evaluation Page (`app/ws/[wsId]/evaluate/[groupId]/page.tsx`)**
   - Split-screen layout (document left, criteria forms right)
   - Text selection → citation flow
   - Progress tracking (e.g., "7 of 10 evaluated = 70%")
   - Batch save truth keys
   - Uses existing DocumentViewer and CriteriaEvaluationForm components

3. **Sample Upload Page (`app/ws/[wsId]/samples/upload/page.tsx`)**
   - Drag-and-drop file upload via DocumentUploader component
   - Multi-file support (primary + supporting docs)
   - Document list with remove functionality
   - Two-step process: upload files → name sample group

4. **Response Structure Builder Component (`components/ResponseStructureBuilder.tsx`)**
   - Visual JSON builder for defining AI response format
   - Drag-to-reorder sections
   - Type badges (text, list, object, number, boolean)
   - Required field toggle
   - Live JSON preview pane
   - Default sections: score_justification, compliance_gaps, recommendations
   - Additional templates: evidence_cited, risk_assessment, confidence_score, etc.

5. **Response Structure Page (`app/ws/[wsId]/response-structure/page.tsx`)**
   - Name and description fields
   - Embeds ResponseStructureBuilder component
   - Save/update functionality
   - Info box explaining how it works

6. **API README Updated**
   - Added workspace-centric route documentation
   - New endpoints: /workspaces, /workspaces/{wsId}/samples, /runs, /response-structure
   - Thoroughness parameter for optimization runs (fast/balanced/thorough)
   - Status options endpoint

**Files Created (6):**
- `app/ws/[wsId]/runs/page.tsx` (400+ lines)
- `app/ws/[wsId]/evaluate/[groupId]/page.tsx` (400+ lines)
- `app/ws/[wsId]/samples/upload/page.tsx` (390+ lines)
- `app/ws/[wsId]/response-structure/page.tsx` (350+ lines)
- `components/ResponseStructureBuilder.tsx` (425+ lines)
- Updated `app/api/README.md` with workspace routes

**Sprint 2 Progress:** Phase 4A+ UI complete, backend pending

**Total UI Pages Created This Sprint:**
- `app/ws/page.tsx` - Workspace list
- `app/ws/new/page.tsx` - Create workspace
- `app/ws/[wsId]/page.tsx` - Workspace detail (6 tabs)
- `app/ws/[wsId]/context/page.tsx` - Context documents (module-kb)
- `app/ws/[wsId]/runs/page.tsx` - Runs list
- `app/ws/[wsId]/runs/new/page.tsx` - New run (thoroughness)
- `app/ws/[wsId]/evaluate/[groupId]/page.tsx` - Evaluation UI
- `app/ws/[wsId]/samples/upload/page.tsx` - Sample upload
- `app/ws/[wsId]/response-structure/page.tsx` - JSON builder

**Next Steps:**
1. Phase 4B-C: Backend implementation (RAG pipeline + LLM meta-prompting)
2. Phase 4D: Testing & refinement
3. Phase 5: Results display & A/B comparison

---

### February 5, 2026 Evening (6:07-6:32 PM) - Route Refactoring + Context Tab Implementation

**Session Duration:** 25 minutes  
**Branch:** `feature/eval-optimization-s2`  
**Objective:** Refactor routes from /projects/ to /ws/ and implement Context tab using module-kb components

**Completed:**

1. **Route Architecture Refactored:**
   - Changed all routes from `/projects/[id]/` to `/ws/[wsId]/` to match workspace-centric database design
   - Created `app/ws/page.tsx` - Workspace list page (274 lines)
   - Created `app/ws/[wsId]/page.tsx` - Workspace detail with 6 tabs (988 lines)
   - Created `app/ws/[wsId]/context/page.tsx` - Context documents using module-kb (113 lines)
   - Created `app/ws/[wsId]/runs/new/page.tsx` - Optimization run with thoroughness selector (268 lines)

2. **Context Tab Implementation:**
   - "Context" tab added to workspace detail page (single word per user preference)
   - Context page wraps existing `WorkspaceDataKBTab` component from module-kb
   - Added domain-specific guidance explaining RAG purpose
   - Uses existing hooks: `useWorkspaceKB`, `useKbDocuments`
   - **Zero new RAG infrastructure** - uses module-kb APIs

3. **Phase 4 Redesign UI:**
   - Removed manual prompt configuration concept (PromptConfigForm never created)
   - Added thoroughness selector: Fast (5 variations), Balanced (7), Thorough (12)
   - System automatically generates domain-aware prompts via RAG + LLM meta-prompting

4. **Cleanup:**
   - Deleted old `app/projects/` directory

**Key Decisions:**
- Route structure: `/ws/[wsId]/` (not `/projects/[id]/`)
- Tab label: "Context" (single word)
- Section label: "Context Documents" (with RAG explanation)
- No manual prompt editing - system generates prompts automatically

**Files Created (4):**
- `templates/_project-stack-template/apps/eval-optimizer/app/ws/page.tsx`
- `templates/_project-stack-template/apps/eval-optimizer/app/ws/[wsId]/page.tsx`
- `templates/_project-stack-template/apps/eval-optimizer/app/ws/[wsId]/context/page.tsx`
- `templates/_project-stack-template/apps/eval-optimizer/app/ws/[wsId]/runs/new/page.tsx`

**Files Deleted (1):**
- `templates/_project-stack-template/apps/eval-optimizer/app/projects/` (entire directory)

**Sprint 2 Progress:** Phases 0-3 complete, Phase 4A UI complete, Phase 4A backend pending

**Next Steps:**
1. Create remaining pages: `app/ws/new/`, `app/ws/[wsId]/runs/`, `app/ws/[wsId]/evaluate/`, `app/ws/[wsId]/samples/upload/`
2. Implement backend APIs for optimization runs
3. Update API README with workspace-centric endpoints
