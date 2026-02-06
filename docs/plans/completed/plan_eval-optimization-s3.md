# Plan: Evaluation Optimization - Sprint 3 (Integration Testing & Results Display)

**Status:** ✅ COMPLETE (Scope Reduced - UX Design Focus)  
**Branch:** `feature/eval-optimization-s3`  
**Context:** [memory-bank/context-eval-optimization.md](../../memory-bank/context-eval-optimization.md)  
**Created:** February 5, 2026  
**Updated:** February 6, 2026 (5:25 PM)  
**Duration:** 2 days (Feb 5-6, 2026)  
**Dependencies:** ✅ Sprint 2 complete (merged to main)  
**Previous:** [Sprint 2 Plan](plan_eval-optimization-s2.md)  
**Next:** [Sprint 4 Plan](plan_eval-optimization-s4.md) (to be created)

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

## Sprint Goal (Original → Revised)

**Original Goal:** Complete the evaluation optimization workflow with integration testing and results display.

**Revised Goal (Actual):** Fix auth issues, design UX for optimization workflow, and create workspace integration.

**Rationale for Pivot:** During testing, we discovered fundamental UX issues that required redesign before integration testing could proceed meaningfully. Sprint 3 became a "stabilization and UX design" sprint.

**Remaining scope deferred to Sprint 4:**
- Phase 2: Optimization Run Details page (`/ws/[id]/runs/[runId]`)
- Phase 3: Response Sections Builder UI
- Phase 4: Truth Set creation wizard
- Phase 5: Optimization execution and results display

---

## 📊 Sprint 3 Progress Tracker (Final)

| Phase | Status | Key Deliverables | Completion |
|-------|--------|------------------|------------|
| **Remediation** | ✅ COMPLETE | Fix infrastructure templates & validation | 100% |
| **Auth Fixes** | ✅ COMPLETE | next-auth v5, API routes, sign-in page | 100% |
| **Auth Pattern Migration** | ✅ COMPLETE | Migrate workspace pages from NextAuth to module-access | 100% |
| **UX Design** | ✅ COMPLETE | Specification doc + workflow design | 100% |
| **Phase 1: Workspace Tabs** | ✅ COMPLETE | Overview, Context, Optimization, Settings tabs | 100% |
| **Phase 2-5** | ➡️ DEFERRED | Run Details, Truth Set wizard, Optimization | → Sprint 4 |

**Sprint 3 Complete:** Auth working, workspace tabs implemented, UX designed

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

### February 6, 2026 Afternoon (2:30-3:00 PM) - Auth Pattern Migration (HIGH Priority)

**Session Goal:** Fix `useSession` must be wrapped in `<SessionProvider />` error

**Root Cause:**
- eval-opt workspace pages used old NextAuth v4 pattern (`useSession()` from `next-auth/react`)
- Layout.tsx has `AuthProvider` from module-access (correct)
- Pages need to use `useUser()` from module-access (not direct NextAuth)

**Files Fixed (3 HIGH Priority):**

| File | Before | After | Status |
|------|--------|-------|--------|
| `app/ws/page.tsx` | `useSession()` | `useUser()` + `authAdapter.getToken()` | ✅ FIXED |
| `app/ws/new/page.tsx` | `useSession()` | `useUser()` + `authAdapter.getToken()` | ✅ FIXED |
| `app/ws/[wsId]/page.tsx` | `useSession()` + nested components | `useUser()` + props passing | ✅ FIXED |

**Pattern Applied:**
```typescript
// OLD (broken with NextAuth v5):
import { useSession } from "next-auth/react";
const { data: session } = useSession();
if (!session?.accessToken) return;
const client = createApiClient(session.accessToken);

// NEW (CORA module-access pattern):
import { useUser } from "@{{PROJECT_NAME}}/module-access";
const { isAuthenticated, loading: authLoading, authAdapter } = useUser();
if (!isAuthenticated) return;
const token = await authAdapter.getToken();
const client = createApiClient(token);
```

**Sync to Test Project:**
- ✅ `app/ws/page.tsx` synced to `ai-mod-stack`
- ✅ `app/ws/new/page.tsx` synced to `ai-mod-stack`
- ✅ `app/ws/[wsId]/page.tsx` synced to `ai-mod-stack`

**Remaining MEDIUM Priority Files (if issues persist):**

| File | Status |
|------|--------|
| `app/ws/[wsId]/runs/page.tsx` | Pending |
| `app/ws/[wsId]/runs/new/page.tsx` | Pending |
| `app/ws/[wsId]/evaluate/[groupId]/page.tsx` | Pending |
| `app/ws/[wsId]/samples/upload/page.tsx` | Pending |
| `app/ws/[wsId]/response-structure/page.tsx` | Pending |

**Test Project:**
- Stack: `~/code/bodhix/testing/eval-opt/ai-mod-stack/`
- Infra: `~/code/bodhix/testing/eval-opt/ai-mod-infra/`

**Next Steps:**
1. User restarts dev server: `cd ~/code/bodhix/testing/eval-opt/ai-mod-stack && ./scripts/start-opt.sh`
2. User tests workspace list page (`/ws`)
3. If additional pages have errors, fix remaining MEDIUM priority files

---

### February 6, 2026 Afternoon (3:00-5:20 PM) - UX Design & Workspace Integration

**Session Goal:** Fix workspace detail page and design eval-opt UX

**Issues Fixed:**

1. **Workspace Detail Page Using Wrong Pattern** (FIXED)
   - **Problem:** `ws/[wsId]/page.tsx` had custom implementation with hardcoded `/eval-opt/workspaces/` API routes
   - **Fix:** Replaced with module-ws pattern initially, then created custom eval-opt workspace page
   - **Files:** `apps/eval-opt/app/ws/[id]/page.tsx` (rewritten)

2. **Missing WorkspacePluginProvider** (FIXED)
   - **Problem:** WorkspacePluginProvider not in eval-opt components
   - **Fix:** Copied from main app's components folder
   - **Files:** `apps/eval-opt/components/WorkspacePluginProvider.tsx` (NEW)

3. **UX Design Clarification** (COMPLETED)
   - Clarified workflow through user discussion
   - Created specification document: `docs/specifications/spec_eval-opt-workspace-integration.md`

**UX Design Decisions:**

| Tab | Purpose | Implementation |
|-----|---------|----------------|
| Overview | Stats + getting started guide | Custom |
| Context | Domain context docs for RAG | Reuse module-kb WorkspaceDataKBTab |
| Optimization | List runs + create new | Custom (new) |
| Settings | Workspace settings | Standard pattern |

**Optimization Workflow Defined:**
1. Create Optimization Run (select doc type + criteria set)
2. Define Response Sections (JSON structure for AI response)
3. Create Truth Sets (document + manual criterion evaluation)
4. Run Optimization (system generates/tests prompts)
5. Review Results (ranked configurations)

**Truth Set Wizard Design:**
- Score Range: 5-tier system (0-20, 21-40, 41-60, 61-80, 81-100)
- Response Sections: Configurable per run (justification, findings, recommendations)
- Wizard-style with progress indicator and save/resume capability

**Files Created:**
- `docs/specifications/spec_eval-opt-workspace-integration.md` - Full UX specification
- `apps/eval-opt/app/ws/[id]/page.tsx` - Custom workspace detail with 4 tabs
- `apps/eval-opt/components/WorkspacePluginProvider.tsx` - Copied from main app

**Synced to Test Project:**
- ✅ All new files synced to `~/code/bodhix/testing/eval-opt/ai-mod-stack/`

**Implementation Phases Defined:**
- Phase 1: Workspace tabs (Context + Optimization) ✅ COMPLETE
- Phase 2: Optimization Run Details page (future)
- Phase 3: Truth Set wizard (future)

---

**Last Updated:** February 6, 2026 5:20 PM
