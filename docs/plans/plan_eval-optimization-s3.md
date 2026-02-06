# Plan: Evaluation Optimization - Sprint 3 (Integration Testing & Results Display)

**Status:** 🟡 IN PROGRESS (Auth Flow Working)  
**Branch:** `feature/eval-optimization-s3`  
**Context:** [memory-bank/context-eval-optimization.md](../../memory-bank/context-eval-optimization.md)  
**Created:** February 5, 2026  
**Updated:** February 6, 2026 (1:00 PM)  
**Duration:** 1-2 weeks  
**Dependencies:** ✅ Sprint 2 complete (merged to main)  
**Previous:** [Sprint 2 Plan](plan_eval-optimization-s2.md)

---

## 🚨 Critical Infrastructure Remediation

**Priority:** HIGHEST - Completed

The `module-eval-opt` infrastructure template violated the CORA module interface contract. This has been resolved with a new validator and template fixes.

### Remediation Tasks

- [x] **1. Refactor `variables.tf`** (Completed)
- [x] **2. Refactor `main.tf`** (Completed)
- [x] **3. Refactor `outputs.tf`** (Completed)
- [x] **4. Sync & Deploy** (Completed)
  - [x] Created `terraform-module-validator` to prevent recurrence
  - [x] Updated build automation (`backend/build.sh`)
  - [x] Fixed configuration to include `module-voice` (restored lambda count)

---

## Sprint Goal

Complete the evaluation optimization workflow with integration testing and results display. This sprint focuses on **validation and polish** - all code was built in Sprint 2, now we test and refine.

---

## 📊 Sprint 3 Progress Tracker

| Phase | Status | Key Deliverables | Completion |
|-------|--------|------------------|------------|
| **Remediation** | ✅ COMPLETE | Fix infrastructure templates & validation | 100% |
| **Auth Fixes** | ✅ COMPLETE | next-auth v5, API routes, sign-in page | 100% |
| **Phase 4D** | 🟡 ACTIVE | Integration testing (deploy and test end-to-end) | 40% |
| **Phase 5** | 📋 PLANNED | Results display & A/B comparison | 0% |
| **Phase 6** | 📋 PLANNED | Bug fixes & polish | 0% |

---

## What Was Built in Sprint 2 (Ready for Testing)

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

---

## Phase 4D: Integration Testing (Week 1)

**Objective:** Deploy and test the complete optimization workflow end-to-end

### 4D.1: Deployment Setup
- [ ] Deploy database schemas to test environment
- [x] Deploy Lambda function (29 lambdas + module-eval-opt)
- [x] Deploy Lambda layer (eval_opt_common)
- [x] Configure API Gateway routes
- [ ] Verify module-kb integration works

### 4D.2: Workflow Testing
- [ ] Test workspace creation flow
- [ ] Test sample document upload (via module-kb)
- [ ] Test context document upload (via module-kb)
- [ ] Test manual evaluation UI (truth key creation)
- [ ] Test response structure builder
- [ ] Test optimization run start
- [ ] Test optimization run progress tracking
- [ ] Test results retrieval

### 4D.3: RAG Pipeline Testing
- [ ] Verify context docs are retrieved correctly
- [ ] Test domain knowledge extraction
- [ ] Verify prompts reference domain standards
- [ ] Test variation generation (5/7/12 based on thoroughness)

### 4D.4: Permission Testing (ADR-019c)
- [ ] Test workspace access control
- [ ] Test run-level permissions
- [ ] Test document group access
- [ ] Test truth key edit permissions
- [ ] Verify RLS policies work correctly

### Success Criteria
- [ ] Complete workflow executes without errors
- [ ] Optimization run produces results
- [ ] Results compared to truth keys correctly
- [ ] Accuracy metrics calculated
- [ ] Recommendations generated

---

## Phase 5: Results Display & A/B Comparison (Week 1-2)

**Objective:** Display optimization results with actionable insights

### 5.1: Results Page Enhancement
- [ ] Overall accuracy metrics display
- [ ] Per-criteria breakdown table
- [ ] True positive / false positive counts
- [ ] True negative / false negative counts
- [ ] Precision / Recall / F1 score

### 5.2: Error Analysis
- [ ] List of false positives
- [ ] List of false negatives
- [ ] Side-by-side comparison (truth vs AI)
- [ ] Drill-down to specific documents

### 5.3: A/B Comparison
- [ ] Select two runs to compare
- [ ] Delta in accuracy per criterion
- [ ] Highlight improvements/regressions
- [ ] Recommendation for best config

### 5.4: Run Details Page
- [ ] `app/ws/[wsId]/runs/[runId]/page.tsx` - Run detail page
- [ ] Generated prompts display
- [ ] Per-sample results table
- [ ] Export results to CSV

### Success Criteria
- [ ] Analyst can view overall accuracy
- [ ] Analyst can identify problem criteria
- [ ] Analyst can compare two runs
- [ ] Actionable recommendations displayed

---

## Phase 6: Bug Fixes & Polish (Week 2)

**Objective:** Fix issues discovered during testing

### 6.1: Bug Fixes
- [ ] Fix any workflow issues
- [ ] Fix any UI bugs
- [ ] Fix any backend errors
- [ ] Fix any permission issues

### 6.2: UX Polish
- [ ] Loading states for all async operations
- [ ] Error messages for all failure cases
- [ ] Progress indicators for long operations
- [ ] Mobile/tablet responsive fixes

### 6.3: Documentation
- [ ] User guide for analysts
- [ ] API documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide

---

## Testing Environment

**Test Project:** `~/code/bodhix/testing/test-eval-opt/`
- Stack: `ai-mod-stack`
- Infra: `ai-mod-infra`
- Uses: module-eval-optimizer

**Test Data:**
- 5-10 sample documents needed
- Criteria set must be configured
- Context documents for domain (e.g., CJIS standards)

---

## Technical Notes

### RAG Architecture
- Module-kb is the ONLY RAG provider
- Context docs stored in workspace KB
- Embeddings via module-ai
- No new vector infrastructure

### Permission Model (ADR-019c)
- Workspace membership required for all operations
- Run owner has full control
- Workspace members can view runs
- Truth key edits require specific permissions

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| RAG pipeline quality issues | High | Test with real domain docs |
| Slow optimization runs | Medium | Add progress indicators, optimize queries |
| Module-kb integration issues | High | Test early in Phase 4D |
| Permission bugs | Medium | Comprehensive permission testing |

---

## Definition of Done

### Sprint 3 Complete When:
- [ ] Complete workflow tested end-to-end
- [ ] Results display fully functional
- [ ] A/B comparison working
- [ ] No critical bugs remaining
- [ ] Documentation complete
- [ ] Ready for production deployment

---

## Session Log

### February 6, 2026 Morning (8:15 AM) - Infrastructure Remediation

**Issue:** Deployment blocked by Terraform variable mismatch.
**Root Cause:** `module-eval-opt` templates violated CORA module interface contract by requiring non-standard variables.
**Action:** Paused to refactor templates to match standard `module-eval` pattern.

### February 6, 2026 Morning (7:12-7:55 AM) - Test Environment Setup

**Completed:**
- [x] Code sync from main
- [x] Test project creation (ai-mod)
- [x] Template fixes (permissions.py, build.sh)
- [x] Documentation updates (API reference)
- [x] AWS credentials verification

### February 5, 2026 Evening (8:13 PM) - Sprint 3 Created

**Session Goal:** Close Sprint 2 and open Sprint 3

**Completed:**
- [x] Sprint 2 PR merged to main
- [x] Created Sprint 3 branch from main
- [x] Created Sprint 3 plan document

**Next Steps:**
1. Fix infrastructure templates (variables.tf, main.tf, outputs.tf)
2. Sync fixes to test project
3. Deploy infrastructure

---

### February 6, 2026 Afternoon (12:00-1:00 PM) - Auth Flow Complete

**Session Goal:** Fix authentication issues blocking eval-opt testing

**Issues Fixed:**

1. **next-auth Version Mismatch** (FIXED)
   - **Problem:** eval-opt had `next-auth: ^4.24.0` but auth.ts used v5 patterns
   - **Fix:** Updated template to `next-auth: ^5.0.0-beta.30` (matching web app)
   - **Files:** `apps/eval-opt/package.json`

2. **Missing API Auth Routes** (FIXED)
   - **Problem:** No `app/api/auth/[...nextauth]/route.ts` file
   - **Fix:** Created route handler exporting `{ GET, POST }` from handlers
   - **Files:** `apps/eval-opt/app/api/auth/[...nextauth]/route.ts` (NEW)

3. **Missing Sign-in Page** (FIXED)
   - **Problem:** Custom sign-in page not found (`/auth/signin` 404)
   - **Fix:** Created simplified sign-in page using `useSession` from NextAuth
   - **Files:** `apps/eval-opt/app/auth/signin/page.tsx` (NEW)

4. **Okta Redirect URI** (USER ACTION)
   - **Problem:** Okta rejected `http://localhost:3001` redirect
   - **Fix:** User added redirect URI in Okta admin console
   - **Result:** ✅ User successfully logged in!

**Template Files Modified:**
- `apps/eval-opt/package.json` - Updated next-auth to v5
- `apps/eval-opt/app/api/auth/[...nextauth]/route.ts` - NEW
- `apps/eval-opt/app/auth/signin/page.tsx` - NEW
- `scripts/start-opt.sh` - NEXTAUTH_URL override + .env.local symlink

**Next Steps:**
1. Deploy database schemas (7 eval_opt tables)
2. Test workspace creation flow
3. Test optimization run workflow

---

**Last Updated:** February 6, 2026 1:05 PM
