# Context: Evaluation Optimization Initiative

**Created:** February 4, 2026  
**Primary Focus:** Business Analyst Workbench for prompt optimization in module-eval

## Initiative Overview

The Evaluation Optimization initiative develops a **supplemental application** (companion to the main CORA app) that enables business analysts to optimize prompt configurations for document evaluation processing. The system uses sample-driven training with human-verified "truth keys" to tune prompts for specific document domains (IT security policies, appraisals, proposals, etc.), reducing false positives and false negatives in automated evaluations.

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
|--------|--------|------|-----------|-----------|
| S1 | `feature/eval-optimization-s1` | `plan_eval-optimization-s1.md` | � Phase 1 & 2 Complete | Phase 1 (Arch Research), Phase 2 (Prototype) |

## Current Sprint

- **Branch:** `feature/eval-optimization-s1`
- **Plan:** `docs/plans/plan_eval-optimization-s1.md`
- **Focus:** Architecture analysis & prototype to validate deployment model
- **Progress:** Phase 1 & 2 complete, Phase 3 & 4 pending

## Key Design Decisions (To Be Determined in S1)

### 1. Deployment Architecture (PROTOTYPED - Option A)

**Status:** ✅ Phase 2 Complete - Option A prototype validated

Sprint 1 evaluated three deployment options:

**Option A: Same Stack Repo** (`{project}-stack/apps/eval-optimizer/`)
- **Pros:** Shares authentication, types, dependencies with main app
- **Cons:** Couples optimizer lifecycle to main app deployment
- **Prototype:** ✅ Complete - Proves shared auth, code reuse, API integration

**Option B: Separate Repo** (`eval-optimizer-stack/`)
- **Pros:** Independent deployment, clear separation
- **Cons:** Duplicate auth setup, type definitions, infrastructure
- **Prototype:** Not built (Option A selected for prototyping)

**Option C: Toolkit Utility** (`cora-dev-toolkit/tools/eval-optimizer/`)
- **Pros:** Lives with other dev tooling
- **Cons:** Not a production application, limited scalability
- **Prototype:** Not built (Option A selected for prototyping)

**Prototype Findings (Option A):**
- ✅ Shared Okta/Cognito authentication works
- ✅ API client factory reuse (ADR-004 compliance)
- ✅ Zero code duplication for auth, types, utilities
- ✅ Independent build/deploy pipeline (port 3001)
- ✅ Zero additional infrastructure cost

**Decision Pending:** ADR-020 to be created in Phase 4

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

### Truth Key Format (TBD in S1)

Options to evaluate:
- JSON files with expected scores/responses
- Database table (`eval_truth_keys`)
- Spreadsheet format for analyst input
- Combination approach

## Key Features (To Be Designed)

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

## Technical Architecture (High-Level)

### Frontend
- Next.js application (consistent with CORA stack pattern)
- TypeScript + React
- Shared UI library components from main app (if feasible based on deployment model)
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
- New tables:
  - `eval_optimization_runs`
  - `eval_truth_keys`
  - `eval_prompt_versions`
  - `eval_optimization_metrics`

## Success Criteria

### Sprint 1 (Architecture Analysis)
- [ ] ADR-020 created documenting deployment architecture decision (Phase 4 - Pending)
- [x] ✅ Minimal prototype proves:
  - [x] Auth works (same Cognito/NextAuth as main app)
  - [x] Can call module-access, ws, kb, eval APIs
  - [x] Can create org, workspace, upload doc, run eval
- [x] ✅ Recommendation documented with pros/cons of each option
- [ ] Plan for Sprint 2 implementation based on S1 findings (Phase 4 - Pending)
- [ ] **NEXT:** Concept of Operations document for optimization methodology

### Overall Initiative (Multi-Sprint)
- [ ] Business analysts can upload sample docs with truth keys
- [ ] System optimizes prompts per document domain
- [ ] Confidence metrics guide analysts on sample size needs
- [ ] Optimized prompts improve eval accuracy (measurable reduction in false positives/negatives)
- [ ] Domain-specific prompt configurations deployed to production module-eval

## Key Decisions & ADRs

- **ADR-019 (Pending):** Eval Optimizer Deployment Architecture
  - Will document S1 prototype findings and final deployment model choice

## Session Log

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

**Next Steps:**
- Phase 3: Option Evaluation (scoring matrix for A/B/C deployment options)
- Phase 4: ADR-020 documenting architecture decision
- Sprint 2 Planning: Begin core workflow implementation based on ConOps

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

**Next Steps:**
- Phase 3: Option Evaluation (scoring matrix for A/B/C)
- Phase 4: ADR-020 documenting architecture decision
- **CRITICAL:** Develop Concept of Operations for optimization methodology

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

## Open Questions

1. **Truth Key Format:** JSON, database table, spreadsheet, or combination?
2. **Prompt Deployment:** How are optimized prompts deployed to production module-eval?
3. **Multi-Model Support:** Should optimizer support testing across different AI models (GPT-4, Claude, etc.)?
4. **Batch Processing:** Scale requirements for batch evaluation runs?
5. **Access Control:** Who can create/modify domain configurations? Org-level vs. system-level settings?

---

## Next Session Focus

**Phase 3 & 4: Architecture Decision & ADR-020**

Complete Sprint 1 deliverables:
- **Phase 3:** Create deployment option evaluation matrix (Option A vs B vs C)
- **Phase 4:** Write ADR-020 documenting architecture decision and rationale
- **Sprint 2 Planning:** Create detailed implementation plan based on ConOps

With ConOps complete, we have a clear blueprint for implementation. Sprint 2 can begin core workflow development.

---

**Document Status:** 🟢 Phase 1 & 2 Complete  
**Last Updated:** February 4, 2026 9:30 PM
