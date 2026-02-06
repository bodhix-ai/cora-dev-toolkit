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

### Target Users
- **Business Analysts** optimizing evaluation configurations for document domains
- **Not** end users performing document evaluations (different workflow, different UI needs)

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `feature/eval-optimization-s1` | `plan_eval-optimization-s1.md` | ✅ COMPLETE | Architecture, Prototype, ConOps, ADR-021 |
| S2 | `feature/eval-optimization-s2` | `plan_eval-optimization-s2.md` | ✅ COMPLETE | All UI + Backend + Infrastructure (merged to main) |
| S3 | `feature/eval-optimization-s3` | `plan_eval-optimization-s3.md` | 🚧 IN PROGRESS | Just started |

## Current Sprint

- **Sprint 1:** ✅ COMPLETE (Feb 5, 2026 AM)
- **Sprint 2:** ✅ COMPLETE (Feb 5, 2026 PM) - Merged to main via PR #91
- **Sprint 3:** 🚧 IN PROGRESS
- **Branch:** `feature/eval-optimization-s3`
- **Plan:** `docs/plans/plan_eval-optimization-s3.md`
- **Status:** Sprint just started - Integration testing ahead
- **Current Phase:** Phase 4D (Integration Testing)
- **Duration:** 1-2 weeks estimated
- **Progress:** 0% (Sprint 3)
- **Focus:** Testing, results display, bug fixes

## Sprint 2 Deliverables (Merged to Main)

### Frontend (9 UI Pages)
- `app/ws/page.tsx` - Workspace list
- `app/ws/new/page.tsx` - Create workspace
- `app/ws/[wsId]/page.tsx` - Workspace detail (6 tabs)
- `app/ws/[wsId]/context/page.tsx` - Context documents (module-kb)
- `app/ws/[wsId]/runs/page.tsx` - Runs list
- `app/ws/[wsId]/runs/new/page.tsx` - New run (thoroughness selector)
- `app/ws/[wsId]/evaluate/[groupId]/page.tsx` - Evaluation UI
- `app/ws/[wsId]/samples/upload/page.tsx` - Sample upload
- `app/ws/[wsId]/response-structure/page.tsx` - JSON builder

### Backend
- `opt-orchestrator` Lambda (~850 lines)
- RAG pipeline, meta-prompter, variation generator, recommendation engine
- `eval_opt_common` layer with ADR-019c permission functions

### Infrastructure
- Terraform configs (Lambda, API Gateway, IAM)
- 7 database tables with RLS policies

### Documentation
- ADR-021: Eval Optimizer Deployment Architecture
- ConOps specification (13 sections)
- Phase 4 redesign spec (RAG + LLM meta-prompting)

## Key Design Decisions

### 1. Deployment Architecture (DECIDED - ADR-021)

**Decision:** Option A (Same Stack Repo at `{project}-stack/apps/eval-optimizer/`)

**Rationale:**
- ✅ Zero code duplication
- ✅ Shared authentication (same Cognito/NextAuth)
- ✅ Zero additional infrastructure cost
- ✅ Independent build/deploy pipeline (port 3001)
- ✅ Enables paid feature monetization

### 2. Workspace-Centric Design (DECIDED)

**Decision:** Use workspace as optimization container (not separate project entity)

**Rationale:**
- Workspace already provides the container concept
- Workspace members already provide access control
- No need for duplicate project/member tables
- Context docs live in workspace KB (using existing module-kb)

### 3. Automated Prompt Generation (DECIDED)

**Decision:** System automatically generates domain-aware prompts via RAG + LLM meta-prompting

**The "Secret Sauce":**
1. BA uploads context documents (domain standards)
2. System performs RAG to extract domain knowledge
3. BA defines response structure (JSON builder)
4. System generates 5-12 prompt variations automatically
5. System tests all variations against truth keys
6. System provides recommendations for improvement

## Sprint 3 Focus

### Phase 4D: Integration Testing
- Deploy database schemas
- Deploy Lambda function and layer
- Test complete workflow end-to-end
- Verify RAG pipeline works
- Test permission model (ADR-019c)

### Phase 5: Results Display
- Overall accuracy metrics
- Per-criteria breakdown
- Error analysis (FP/FN lists)
- A/B comparison between runs

### Phase 6: Bug Fixes & Polish
- Fix issues discovered in testing
- UX improvements
- Documentation

## Session Log

### February 5, 2026 Evening (8:13 PM) - Sprint 3 Created

**Session Goal:** Close Sprint 2 and open Sprint 3

**Completed:**
- ✅ Sprint 2 PR #91 created and merged to main
- ✅ Created Sprint 3 branch from main
- ✅ Created Sprint 3 plan document
- ✅ Updated context for Sprint 3

**Sprint 2 Summary:**
- 6 commits merged:
  1. ADR-021 architecture decision
  2. Frontend UI (9 pages + components)
  3. Backend Lambda + infrastructure + module layer
  4. Documentation (specs and plans)
  5. Context updates
  6. Sprint 2 close (defer 4D/5 to Sprint 3)

**Next Steps:**
1. Set up test environment
2. Begin Phase 4D integration testing
3. Deploy and test end-to-end workflow

---

**Document Status:** � Sprint 3 In Progress  
**Last Updated:** February 5, 2026 8:13 PM