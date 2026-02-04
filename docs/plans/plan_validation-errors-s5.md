# CORA Validation Errors - Sprint S5

**Status:** 🟡 IN PROGRESS  
**Branch:** `fix/validation-errors-s5`  
**Created:** February 4, 2026  
**Test Project:** ws-optim (ai-mod-stack)  
**Context:** `memory-bank/context-error-remediation.md`  
**Baseline:** Post WS Plugin S4 completion  
**Current Status:** ✗ FAILED (Bronze Certification → Target: Silver)

---

## 📊 Current Validation State (February 4, 2026)

**Validation Run:** ws-optim test project after WS Plugin Architecture S4 completion

| Metric | Value | Notes |
|--------|-------|-------|
| **Overall Status** | ✗ FAILED | Bronze Certification |
| **Total Errors** | **869** | 92% from API Tracer alone |
| **Total Warnings** | **458** | Mostly API Tracer orphaned routes |
| **Duration** | 283s | ~5 minutes |
| **Passing Validators** | **13/20** | 65% pass rate |
| **Failing Validators** | **7/20** | 35% fail rate |

### Error Distribution by Validator

| Validator | Status | Errors | Warnings | % of Total | Priority |
|-----------|--------|--------|----------|------------|----------|
| **API Tracer** | ❌ | **802** | 242 | **92.3%** | P2 (False positives) |
| **Role Naming** | ❌ | **41** | 0 | **4.7%** | P3 (Validator code) |
| **Frontend Compliance** | ❌ | **13** | 0 | **1.5%** | P1 (Real issues) |
| **Accessibility** | ❌ | **4** | 23 | **0.5%** | P0 (Legal req) |
| **Admin Auth** | ❌ | **4** | 6 | **0.5%** | P1 (Security) |
| **Database Naming** | ❌ | **4** | 10 | **0.5%** | P2 (Templates) |
| **Audit Columns** | ❌ | **1** | 0 | **0.1%** | P1 (Validator bug) |
| **Workspace Plugin** | ✅ | 0 | 29 | 0% | - |
| **Portability** | ✅ | 0 | 15 | 0% | - |
| **TOTAL** | - | **869** | **458** | **100%** | - |

### ✅ Passing Validators (13/20)

- Structure Validator (1 warning)
- Portability Validator (15 warnings)
- Import Validator
- Schema Validator (83 warnings)
- External UID Validator
- CORA Compliance (19 warnings)
- API Response Validator
- RPC Function Validator
- UI Library Validator
- TypeScript Type Check
- Next.js Routing Validator
- Workspace Plugin Architecture (29 warnings)
- Admin Route Validator (30 warnings)

---

## Delegation to Specialized Plans

### Audit Columns (1 error) - DELEGATED
**Scope:** `docs/plans/plan_audit-column-compliance.md`
- Validator runtime failure investigating table compliance
- Part of comprehensive audit column compliance effort (8 tables)
- Estimated: 14-20 hours for full module compliance

### Database Naming (4 errors) - DELEGATED
**Scope:** `docs/plans/plan_db-naming-migration.md`
- 4 index naming errors in templates (voice, ai, eval)
- Part of Phase 7 template cleanup
- Estimated: 30 minutes for simple find/replace

---

## Priority-Based Remediation Strategy

### Phase 0: Low-Hanging Fruit (P0) - Est. 6-8 hours

**Goal:** Eliminate all immediate, easy-to-fix errors

#### 0.1 Role Naming Validator Fix (41 errors - 30 min)

**Root Cause:** Validator code itself uses old role names, not project code!

**Location:** `validation/api-tracer/code_quality_validator.py`

**Errors:**
- Lines 62-69: Using `global_role`, `platform_owner`, `globalRole`
- Should use: `sys_role`, `sys_owner`, `sysRole`

**Fix:**
```python
# Line 62-69: Update validator code to use standard role names
ROLE_PATTERNS = {
    'sys_role': r'\bsys_role\b',  # Not global_role
    'sys_owner': r'\bsys_owner\b',  # Not platform_owner
    'sysRole': r'\bsysRole\b',  # Not globalRole (TypeScript)
}
```

**Why Low-Hanging Fruit:**
- Single file to fix
- Validator code, not application code
- No production impact
- 41 errors eliminated instantly

**Estimated Time:** 30 minutes

---

#### 0.2 Frontend Compliance (13 errors - 2-3 hours)

**Errors:**
1. Switch missing label - `admin/org/mgmt/page.tsx:290`
2. Heading skip (h4→h6) - `admin/org/mgmt/page.tsx:193`
3. Heading skip (h3→h6) - `admin/org/mgmt/page.tsx:199`
4. Heading skip (h3→h6) - `admin/org/mgmt/page.tsx:207`

**Files Affected:**
- `apps/web/app/admin/org/mgmt/page.tsx` (NEW - added in WS Plugin S4)

**Root Cause:** New org admin module config page created in S4 lacks proper accessibility attributes.

**Fixes:**
```tsx
// Line 290: Add aria-label to Switch
<Switch 
  checked={module.isEnabled}
  onChange={() => handleToggleEnabled(module)}
  aria-label={`Toggle ${module.displayName}`}
  size="small"
/>

// Lines 193, 199, 207: Fix heading hierarchy
// Change all variant="h6" to variant="h5" (proper sequence: h4→h5)
<Typography variant="h5">Total Modules</Typography>
<Typography variant="h5">Enabled</Typography>
<Typography variant="h5">System Disabled</Typography>
```

**Why Low-Hanging Fruit:**
- All in admin pages (clear patterns)
- Type safety + API client fixes
- No architectural decisions needed

**Errors:**
1. `admin/org/kb/page.tsx:36` - `any` type
2. `admin/org/mgmt/page.tsx:318` - Missing IconButton aria-label
3. `admin/sys/kb/page.tsx:48` - `any` type
4. `admin/sys/mgmt/modules/page.tsx:93` - Direct fetch() vs authenticated client
5. `admin/sys/mgmt/modules/page.tsx:120` - Direct fetch() vs authenticated client
6. + 8 more similar issues

**Fix Patterns:**
```typescript
// Replace 'any' with proper types
const handleAction = (data: ModuleConfig) => { ... }  // Not: (data: any)

// Add aria-label to IconButtons
<IconButton aria-label="Close dialog" onClick={...}>

// Use authenticated client
import { createAuthenticatedClient } from '@ai-sec/api-client';
const client = createAuthenticatedClient();
const response = await client.get('/endpoint');  // Not: fetch()
```

**Estimated Time:** 2-3 hours

---

#### 0.3 Admin Auth (4 errors - 1-2 hours)

**Why Low-Hanging Fruit:**
- ADR-019a standard patterns
- Copy-paste from working pages
- Clear auth requirements


**Errors:**
1. `admin/org/mgmt/page.tsx` - Usage of `organization.name` (should be `orgName`)
2. `admin/org/mgmt/page.tsx` - Missing `useUser()` hook
3. `admin/org/ws/[id]/page.tsx` - Missing auth check (`isAuthenticated && profile`)
4. `admin/sys/ws/page.tsx` - Missing auth check (`isAuthenticated && profile`)

**Pattern:** ADR-019a compliance (frontend admin auth standard)

**Fixes Required:**
```typescript
// admin/org/mgmt/page.tsx
const { user, loading } = useUser();
const { orgId, orgName } = useOrganizationContext(); // Use orgName, not name

if (loading) {
  return <Box><CircularProgress /></Box>;
}

// admin/org/ws/[id]/page.tsx & admin/sys/ws/page.tsx
const { user, loading, isAuthenticated, profile } = useUser();

if (loading) return <Box><CircularProgress /></Box>;
if (!isAuthenticated || !profile) return <Alert severity="error">Unauthorized</Alert>;
```

**Estimated Time:** 1-2 hours

---

#### 0.4 Accessibility (4 errors - 1 hour)

**Why Low-Hanging Fruit:**
- All in one file (new S4 page)
- Simple heading hierarchy + aria-label
- Legal requirement (Section 508)

**Target:** 4 accessibility errors in new org admin page

**Errors:**
1. Switch missing label - `admin/org/mgmt/page.tsx:290`
2. Heading skip (h4→h6) - `admin/org/mgmt/page.tsx:193`
3. Heading skip (h3→h6) - `admin/org/mgmt/page.tsx:199`
4. Heading skip (h3→h6) - `admin/org/mgmt/page.tsx:207`

**Fixes:**
```tsx
// Line 290: Add aria-label to Switch
<Switch 
  checked={module.isEnabled}
  onChange={() => handleToggleEnabled(module)}
  aria-label={`Toggle ${module.displayName}`}
  size="small"
/>

// Lines 193, 199, 207: Fix heading hierarchy
// Change all variant="h6" to variant="h5" (proper sequence: h4→h5)
<Typography variant="h5">Total Modules</Typography>
<Typography variant="h5">Enabled</Typography>
<Typography variant="h5">System Disabled</Typography>
```

**Estimated Time:** 1 hour

---

**Phase 0 Summary:**
- **Total Errors Fixed:** 62 (41 role naming + 13 frontend + 4 admin auth + 4 accessibility)
- **Estimated Time:** 6-8 hours
- **Impact:** Reduces error count from 869 → 807 (7% reduction)
- **Benefit:** All low-hanging fruit eliminated, clear path to Silver certification

---

### Phase 1: API-Tracer Integration & Enhancement (P1) - Est. 8-12 hours

**Goal:** Integrate full API-Tracer into validation suite with enhanced reporting

#### 1.1 Current State Analysis

**Current State:** 802 route mismatch errors (92% of all errors!)

**Error Types:**
1. **Route not found** - Frontend calls routes that don't exist in API Gateway
2. **Orphaned routes** (242 warnings) - Lambda handlers with no frontend calls

**Common Patterns:**
- `/admin/rag/providers/*` routes
- `/chats/{sessionId}/kb/documents/*` routes  
- `/projects/{projectId}/*` routes
- `.next/server/` build artifacts being scanned

**Problems:**
1. **802 errors (92% of total)** - Dominates validation output
2. **Poor categorization** - Route mismatches mixed with quality checks
3. **No module summary** - Can't see which modules have issues
4. **Verbose output** - Hard to identify actionable items
5. **Missing integration** - Not single source of truth for all tests

**Current API-Tracer Tests:**
- Route matching (frontend ↔ API Gateway ↔ Lambda)
- Auth lifecycle validation (ADR-019)
- Code quality checks (type safety, naming)
- Lambda route documentation (docstring standard)

#### 1.2 Integration Scope

**Consolidate Standalone Tests:**
- ✅ Auth Pattern Validator → Already in API-Tracer
- ✅ Frontend Compliance → Already in API-Tracer (code quality)
- ✅ Role Naming → Already in API-Tracer (code quality)
- ⚠️ Admin Auth Validator → KEEP STANDALONE (different focus)
- ⚠️ Accessibility Validator → KEEP STANDALONE (WCAG compliance)

**Goal:** Single source of truth for API/Lambda/Frontend validation

#### 1.3 Enhanced Reporting Structure

**New Summary Format:**

```
API Tracer Validation Report

MODULE SUMMARY:
--------------------------------------------------------------------------------
Module: module-kb
  Route Matching:     5 errors, 12 warnings
  Auth Lifecycle:     0 errors, 2 warnings
  Code Quality:       3 errors, 8 warnings
  Documentation:      1 error, 0 warnings
  TOTAL:             9 errors, 22 warnings

Module: module-chat
  Route Matching:     2 errors, 8 warnings
  Auth Lifecycle:     0 errors, 1 warning
  Code Quality:       1 error, 3 warnings
  Documentation:      0 errors, 0 warnings
  TOTAL:             3 errors, 12 warnings

... (repeat for each module)

OVERALL SUMMARY:
--------------------------------------------------------------------------------
Route Matching:     450 errors, 180 warnings (56% of errors)
Auth Lifecycle:     0 errors, 15 warnings (0% of errors)
Code Quality:       350 errors, 45 warnings (44% of errors)
Documentation:      2 errors, 2 warnings (0.2% of errors)

TOTAL:             802 errors, 242 warnings

TOP ISSUES:
1. Route not found: 450 occurrences (.next/ build artifacts, legacy routes)
2. Inline role lists: 41 occurrences (code quality - validator code itself)
3. Direct fetch() calls: 13 occurrences (should use authenticated client)
4. Missing aria-labels: 4 occurrences (IconButtons)
```

#### 1.4 Implementation Tasks

**Task 1: Enhance Reporter (2-3 hours)**
- Add module grouping to summary
- Add sub-category breakdowns (route/auth/quality/docs)
- Add "Top Issues" section with counts
- Add progress tracking (errors over time)

**Task 2: Improve Categorization (2-3 hours)**
- Separate route matching from code quality
- Tag errors with module name
- Add severity levels (critical, high, medium, low)
- Add actionability flags (fix now, review, whitelist)

**Task 3: Filtering & Exclusions (2-3 hours)**
- Exclude `.next/` directory from route scanning
- Whitelist known intentional patterns (webhooks, internal APIs)
- Add configuration file for exclusions
- Document whitelist rationale

**Task 4: Integration Testing (2-3 hours)**
- Verify all tests still run correctly
- Update documentation
- Update CI/CD integration
- Create migration guide for users

**Estimated Time:** 8-12 hours

---

### Phase 2: Architecture Review (P2) - Est. 4-6 hours

**Goal:** Analyze and triage remaining API-Tracer errors after enhancements

#### 2.1 Route Mismatch Analysis

**Common Patterns:**
- `/admin/rag/providers/*` routes - RAG provider management
- `/chats/{sessionId}/kb/documents/*` routes - Chat-KB integration
- `/projects/{projectId}/*` routes - Legacy project scope?
- `.next/server/` build artifacts - Should be excluded

**Questions to Answer:**
1. Are `.next/` routes real or build artifacts? (Exclude them)
2. Are orphaned routes intentional (webhooks, internal APIs)? (Whitelist them)
3. Are missing routes planned features? (Document as tech debt)
4. Are frontend calls using wrong endpoints? (Fix frontend)

**Decision Matrix:**

| Pattern | Action | Rationale |
|---------|--------|-----------|
| `.next/*` | Exclude | Build artifacts, not source |
| `/internal/*` | Whitelist | Internal APIs, no frontend |
| `/webhooks/*` | Whitelist | External integrations |
| Legacy routes | Document | Plan migration, track as tech debt |
| Real mismatches | Fix | Update frontend or add route |

**Deliverable:** Whitelist configuration + tech debt backlog

**Estimated Time:** 4-6 hours

---

## Success Criteria

### Bronze → Silver Certification

- [x] TypeScript: 0 errors ✅ (Already passing)
- [x] Portability: 0 errors ✅ (Already passing)
- [x] Structure: 0 errors ✅ (Already passing)
- [ ] Accessibility: 0 errors (4 pending - Phase 0)
- [ ] Admin Auth: 0 errors (4 pending - Phase 1)
- [ ] Frontend Compliance: 0 errors (13 pending - Phase 1)

### Silver → Gold Certification

- [ ] All validators pass (7 failing)
- [ ] Warnings reduced to <50 (458 current)
- [ ] API Tracer cleaned up (802 errors + 242 warnings)

---

## Implementation Sequence

### Sprint 1: Low-Hanging Fruit (P0) - Est. 6-8 hours

**Goal:** Eliminate all immediate, easy-to-fix errors

1. **Phase 0.1:** Role naming validator fix (30 min) - 41 errors
2. **Phase 0.2:** Frontend compliance (2-3 hours) - 13 errors
3. **Phase 0.3:** Admin auth (1-2 hours) - 4 errors
4. **Phase 0.4:** Accessibility (1 hour) - 4 errors

**Success Metric:** 62 errors eliminated, all low-hanging fruit complete

**Impact:** 869 → 807 errors (7% reduction), clear path to Silver certification

---

### Sprint 2: API-Tracer Integration (P1) - Est. 8-12 hours

**Goal:** Single source of truth for validation with enhanced reporting

1. **Phase 1.1:** Enhance reporter with module summaries (2-3 hours)
2. **Phase 1.2:** Improve categorization (route/auth/quality/docs) (2-3 hours)
3. **Phase 1.3:** Add filtering and exclusions (2-3 hours)
4. **Phase 1.4:** Integration testing and documentation (2-3 hours)

**Success Metric:** Clear, actionable validation reports with module-level summaries

---

### Sprint 3: Architecture Review (P2) - Est. 4-6 hours

**Goal:** Analyze and triage remaining API-Tracer errors

1. **Phase 2.1:** Route mismatch analysis (2-3 hours)
2. **Phase 2.2:** Create whitelist configuration (1-2 hours)
3. **Phase 2.3:** Document tech debt backlog (1 hour)

**Success Metric:** Whitelist config created, tech debt documented, actionable errors < 100

---

## Comparison to Previous Baseline

### Historical Progress (January 19, 2026)

The previous validation remediation effort (test-valid project) achieved:
- **Baseline:** 2,245 errors
- **After 5 sprints:** 89 errors
- **Reduction:** 2,156 errors eliminated (96% improvement)

**Key Achievements:**
- ✅ TypeScript: 2,170 → 5 errors (99.8% reduction)
- ✅ Created tsconfig.json standard for all modules
- ✅ Fixed accessibility in module-voice
- ✅ Fixed portability issues (placeholder standards)
- ✅ Fixed UI library violations (Tailwind → MUI)

### Current State (February 4, 2026)

**Test Project:** ws-optim (different from test-valid)

**Why Higher Error Count:**
1. **Different test project** - ws-optim includes admin UI features
2. **API Tracer dominates** - 802 errors (mostly architectural, not bugs)
3. **New features added** - WS Plugin S4 added org admin pages
4. **More comprehensive scanning** - Including .next/ build artifacts

**Real Actionable Errors:** 25 (excluding API Tracer)
- 4 accessibility
- 4 admin auth
- 13 frontend compliance
- 4 database naming

**Comparison:**
- **Previous effort:** Focused on TypeScript + module cleanup
- **Current effort:** Focus on security, accessibility, API architecture

---

## Notes & Decisions

### February 4, 2026 - WS Plugin S4 Baseline Established

**Context:**
- Completed WS Plugin Architecture Sprint 4
- Added dynamic module configuration (org/workspace level)
- Created new org admin module config page
- Validated against ws-optim test project

**Key Findings:**
1. **API Tracer needs architectural review** - 802 errors suggest validator tuning needed
2. **New S4 pages need accessibility** - 4 errors all in new org admin page
3. **TypeScript now passing** - Historical work paid off (tsconfig.json standard)
4. **Most validators passing** - 13/20 (65%) vs historical ~50%

**Priority Recommendations:**
1. **Sprint 1 (This week):** Eliminate all low-hanging fruit (62 errors) - 6-8 hours
2. **Sprint 2 (Next week):** Integrate and enhance API-Tracer reporting - 8-12 hours
3. **Sprint 3 (Following week):** Architecture review and cleanup - 4-6 hours

**Delegated Scopes:**
- **Audit Columns:** See `docs/plans/plan_audit-column-compliance.md` (14-20 hours)
- **Database Naming:** See `docs/plans/plan_db-naming-migration.md` (30 min template cleanup)

**Total Estimated Effort:** 18-26 hours (2-3 weeks part-time)

---

**Status:** Ready for Implementation  
**Next Action:** Run Phase 0 (accessibility fixes) on new org admin page  
**Estimated Time to Silver:** 6-8 hours (Phases 0 + 1)  
**Estimated Time to Gold:** 12-18 hours (All phases)