# CORA Validation Remediation Plan

**Created:** 2026-01-18  
**Updated:** 2026-01-19 (Baseline Established, Voice/Chat Priority)  
**Branch:** `validation-test-resolution`  
**Branch Goal:** Eliminate all validation errors NOT associated with module-eval & module-ws  
**Test Project:** test-valid (ai-sec-stack)

## Starting Baseline (2026-01-19T11:46:58)

**After infrastructure fixes (tsconfig, UI Library validator path):**
- **Overall Status:** ✗ FAILED (Bronze Certification)
- **Total Errors:** 2,245 (TypeScript now running - was 76 when TS couldn't run)
- **Total Warnings:** 343
- **Duration:** 23.3 seconds

### Error Breakdown by Validator

| Validator | Status | Errors | Notes |
|-----------|--------|--------|-------|
| TypeScript Type Check | ❌ | 2,170 | Now visible (was hidden by config issue) |
| Accessibility | ❌ | 40 | module-voice (4), module-eval (29+), module-chat |
| Frontend Compliance | ❌ | 29 | All in module-eval (SKIP per strategy) |
| API Tracer | ❌ | 5 | KB document completion routes |
| UI Library | ❌ | 1 | Bash script missing (minor tooling issue) |
| **Passing (10/17)** | ✅ | 0 | Structure, Portability, Import, Schema, External UID, CORA, API Response, Role Naming, RPC, DB Naming |

## Executive Summary

This plan addresses validation errors discovered during testing, **prioritizing module-voice and module-chat** to prepare them for functional testing. Fixes are applied to **templates first** (CORA toolkit), then synced to test projects.

**Prioritization Strategy:**
- **HIGH PRIORITY:** module-voice, module-chat (untested, need validation cleanup before functional testing)
- **AVOID:** module-eval, module-ws (active development - workspace integration)
- **LOW PRIORITY:** module-kb, web app infrastructure (after voice/chat are clean)

**Branch Goal:** Reduce errors from 2,245 to ~200 (voice/chat/kb/infrastructure only, excluding eval/ws)

## Current Validation Status

### ✅ Passing Validators (10/17)
- Structure Validator
- Portability Validator (15 warnings)
- Import Validator
- Schema Validator (73 warnings)
- External UID Validator
- CORA Compliance (20 warnings)
- API Response Validator
- Role Naming Validator
- RPC Function Validator
- Database Naming Validator

### ❌ Failing Validators (7/17)
1. **TypeScript Type Check** - 2,165 errors (CRITICAL)
2. **Accessibility Validator** - 40 errors (HIGH)
3. **Frontend Compliance** - 29 errors (HIGH)
4. **API Tracer** - 1 error, 207 warnings (MEDIUM)
5. **UI Library Validator** - 1 error (LOW - tooling issue)

---

## Phase 1: CRITICAL - TypeScript Configuration & Type Errors

**Priority:** P0 - Blocks compilation (but mostly config issues!)  
**Total Errors:** 2,165 errors  
**Estimated Effort:** 2-3 days (was 3-5, reduced after investigation)  
**Affected Areas:** Web app config, module routes, ~100-200 real code errors

**⚠️ Investigation Finding:** The 2,165 errors are NOT all code bugs. Breakdown:
- ~1,000+ errors: Test files missing jest types (LOW - config)
- ~500+ errors: Web app missing @/* path aliases (HIGH - config)
- ~500+ errors: Module routes using wrong import paths (MEDIUM - code)
- ~100-200 errors: Real type errors (MEDIUM - code)

**Why Previous Branches Passed:** They didn't run `pnpm -r run type-check` across all packages during development.

### 1.1 Fix Web App TypeScript Config (30 minutes)

**Impact:** Eliminates ~1,500 errors immediately

**File:** `templates/_project-stack-template/apps/web/tsconfig.json`

**Changes needed:**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]  // ADD: Web app path alias
    }
  },
  "exclude": [
    "node_modules",
    "**/__tests__/**",      // ADD: Exclude test files
    "**/*.test.ts",         // ADD: Exclude test files
    "**/*.test.tsx"         // ADD: Exclude test files
  ]
}
```

**Why:** 
- Test files need `@types/jest` OR should be excluded (~1,000 errors)
- Web app imports use `@/` prefix but tsconfig doesn't define it (~500 errors)

**Verification:**
```bash
cd templates/_project-stack-template/apps/web
pnpm type-check  # Should drop from 1,500+ errors to ~600-700
```

### 1.2 Fix Module Route Import Paths (1-2 days)

**Impact:** Eliminates ~500 errors

**Pattern:** Routes using relative paths instead of package aliases

**Files Affected:**
- `templates/_modules-functional/module-voice/routes/**/*.tsx`
- `templates/_modules-functional/module-eval/routes/**/*.tsx`
- Other module route files

**Current (WRONG):**
```tsx
import { useVoiceSession } from '../../../frontend';
import { VoiceSession } from '../../frontend/types';
```

**Should be:**
```tsx
import { useVoiceSession } from '@{project}/module-voice';
import type { VoiceSession } from '@{project}/module-voice';
```

**Why:** Routes are copied to apps/web/app/ during project creation but use relative paths that break in the new location.

**Bulk Fix Strategy:**
1. Search for all imports matching `../../../frontend` or `../../frontend`
2. Replace with package alias `@{project}/module-{name}`
3. Ensure package exports these types in `index.ts`

### 1.3 Fix Real Type Errors (~100-200 errors, 1-2 days)

**After Steps 1.1 and 1.2, only ~100-200 real type errors remain**

#### 1.3.1 ListDocumentsResponse Type Mismatch (1 error)

**File:** `templates/_modules-core/module-kb/frontend/hooks/useWorkspaceKB.ts:114`

**Error:** `Argument of type 'ListDocumentsResponse' is not assignable to parameter of type 'SetStateAction<KbDocument[]>'`

**Fix:**
```typescript
// Current (incorrect)
setDocuments(result.data)  // Type: ListDocumentsResponse

// Should be
setDocuments(result.data.documents)  // Type: KbDocument[]
```

#### 1.3.2 UserOrganization Type Issues (4 errors)

**File:** `templates/_modules-functional/module-eval/routes/admin/org/eval/page.tsx:57-60`

**Error:** `Property 'id' does not exist on type 'UserOrganization'`

**Investigation needed:** Check UserOrganization type definition, likely should be `orgId` or `organizationId`

#### 1.3.3 User sys_role Property (1 error)

**File:** `templates/_project-stack-template/apps/web/app/admin/sys/kb/page.tsx:55`

**Error:** `Property 'sys_role' does not exist on type '{ id: string; } & User'`

**Fix:** Check User type definition or use correct property name

#### 1.3.4 Other Module-Specific Errors (~100-200 total)

**Approach:**
- Run type-check after Steps 1.1 and 1.2
- Group remaining errors by file/module
- Fix systematically, starting with most common patterns

### 1.4 Updated Strategy

**Correct Sequence:**
1. **Phase 1.1** (30 min) - Fix web app tsconfig → Eliminates ~1,500 errors
2. **Phase 1.2** (1-2 days) - Fix route imports → Eliminates ~500 errors  
3. **Phase 1.3** (1-2 days) - Fix remaining real errors → ~100-200 errors

**Success Criteria:**
- After 1.1: Errors drop from 2,165 → ~600-700
- After 1.2: Errors drop to ~100-200
- After 1.3: `pnpm -r run type-check` passes with 0 errors

---

## Phase 2: HIGH - Accessibility Compliance (LEGAL REQUIREMENT)

**Priority:** P1 - Section 508 compliance required for government use  
**Error Count:** 40 errors + 27 warnings  
**Estimated Effort:** 2-3 days  
**Affected Modules:** module-voice, module-eval, module-chat

### 2.1 IconButton Missing ARIA Labels (40 errors)

**WCAG SC:** 1.1.1 (Level A - Non-text Content)  
**Severity:** Error

**Pattern:**
```tsx
// ❌ WRONG
<IconButton onClick={...} title="Delete">
  <DeleteIcon />
</IconButton>

// ✅ CORRECT
<IconButton 
  onClick={...}
  aria-label="Delete item"
  title="Delete"
>
  <DeleteIcon />
</IconButton>
```

**Files to Fix:**
- `templates/_modules-functional/module-voice/frontend/components/InterviewRoom.tsx` (3 errors)
- `templates/_modules-functional/module-voice/frontend/pages/SysVoiceConfigPage.tsx` (1 error)
- `templates/_modules-functional/module-eval/frontend/components/CriteriaImportDialog.tsx` (2 errors)
- `templates/_modules-functional/module-eval/frontend/components/CriteriaItemEditor.tsx` (3 errors)
- + 31 more across all eval components

**Bulk Fix Strategy:**
```bash
# Create skill or script to add aria-label to all IconButtons with title attribute
# Pattern: title="X" → aria-label="X" (convert to action-oriented label)
```

### 2.2 Heading Level Skipping (4 errors)

**WCAG SC:** 1.3.1 (Level A - Info and Relationships)  
**Severity:** Error

**Files to Fix:**
- `templates/_modules-functional/module-voice/frontend/components/InterviewRoom.tsx:296`

**Fix:** Ensure heading hierarchy doesn't skip levels (h1 → h2 → h3, never h1 → h6)

### 2.3 Form Validation Accessibility (27 warnings)

**WCAG SC:** 3.3.1 (Level A - Error Identification)  
**Severity:** Warning

**Pattern:**
```tsx
// ❌ MISSING aria-invalid and aria-describedby
<TextField
  error={!!errors.name}
  helperText={errors.name}
/>

// ✅ CORRECT
<TextField
  error={!!errors.name}
  helperText={errors.name}
  aria-invalid={!!errors.name}
  aria-describedby={errors.name ? "name-error" : undefined}
  FormHelperTextProps={{
    id: "name-error"
  }}
/>
```

**Files to Fix:**
- `templates/_modules-functional/module-voice/frontend/components/ConfigForm.tsx`
- All form components across modules

### 2.4 Placeholder Not Label (22 warnings)

**Pattern:**
```tsx
// ❌ Placeholder without visible label
<TextField
  placeholder="Search chats..."
  aria-label="Search chats"
/>

// ✅ Add visible label
<TextField
  label="Search chats"
  placeholder="Type to search..."
  aria-label="Search chats"
/>
```

---

## Phase 3: HIGH - Frontend ARIA Compliance (29 errors)

**Priority:** P1 - Same as accessibility, ensures screen reader compatibility  
**Error Count:** 29 errors  
**Estimated Effort:** 1 day (overlap with Phase 2)

**Files to Fix:**
- `templates/_modules-functional/module-eval/frontend/components/*.tsx` (all 8 components)

**Note:** This overlaps significantly with Phase 2.1 (IconButton aria-labels). Fix both simultaneously.

---

## Phase 4: MEDIUM - API Route Mismatches

**Priority:** P2 - Affects runtime functionality  
**Error Count:** 1 error, 207 warnings  
**Estimated Effort:** 1-2 days

### 4.1 Critical Error: Route Not Found

**Error:** Frontend calls `GET {baseURL}{url}` but route doesn't exist in API Gateway

**File:** `templates/_modules-core/module-kb/frontend/lib/api.ts:159`

**Investigation Needed:**
1. Identify the specific endpoint being called
2. Check if it should be added to API Gateway
3. Or fix the frontend to use the correct endpoint

### 4.2 Orphaned Routes (207 warnings)

**Pattern:** Lambda handlers exist but no frontend calls

**Top Orphaned Routes:**
- `/api/voice/configs/*` - 5 routes (GET, POST, PUT, DELETE)
- `/api/voice/sessions/*` - Multiple routes
- Other module endpoints

**Decision Required:**
- Are these intentional (webhooks, internal APIs)?
- Or dead code to remove?

**Action:** Create inventory of all orphaned routes, categorize by intent, remove dead code.

---

## Phase 5: LOW - Tooling Issues

**Priority:** P3 - Doesn't block functionality  
**Error Count:** 1 error  
**Estimated Effort:** 30 minutes

### 5.1 UI Library Validator Script Path

**Error:** `Validation script not found: /Users/aaron/code/bodhix/testing/test-embed/ai-sec-stack/scripts/scripts/validate-ui-library.sh`

**Root Cause:** Incorrect path (double `/scripts/scripts/`)

**Fix:** Update validator path in `validation/cora-validate.py` or the script copy logic in `create-cora-project.sh`

---

## Phase 6: WARNINGS - Non-Blocking Improvements

**Priority:** P4 - Quality improvements  
**Warning Count:** 343 warnings

### 6.1 Hardcoded AWS Regions (15 warnings)

**Files:**
- `templates/_modules-core/module-chat/backend/lambdas/chat-stream/lambda_function.py`
- `templates/_modules-core/module-ai/backend/lambdas/provider/lambda_function.py`

**Fix:** Replace `'us-east-1'` defaults with `os.environ.get('AWS_REGION', 'us-east-1')`

### 6.2 Schema Validator Table Extraction (73 warnings)

**Files:** Validation scripts themselves (not project code)

**Fix:** Improve query parsing in `schema-validator/query_parser.py` to handle `.table()` pattern

### 6.3 Batch Processing Detection (20 warnings)

**Non-issue:** CORA Compliance validator flagging Lambdas without batch processing. This is expected for most CRUD operations.

**Action:** Update validator to reduce noise, or document expected behavior.

---

## Implementation Sequence (REVISED - Voice/Chat Priority)

### Sprint 0: Foundation (COMPLETE ✅)
- [x] Fix web app tsconfig.json (Phase 1.1) → TypeScript now runs successfully
- [x] Fix UI Library validator path (Phase 5.1) → Removed double `/scripts/scripts/` bug
- [x] Establish baseline (2,245 errors, 343 warnings)

### Sprint 1: module-voice Validation Cleanup (COMPLETE ✅ - 2026-01-19)
- [x] Fix IconButton aria-labels in InterviewRoom.tsx (3 buttons), ConfigForm.tsx, SysVoiceConfigPage.tsx (2 buttons) (Phase 2.1)
- [x] Fix heading hierarchy in InterviewRoom.tsx (Phase 2.2)
- [x] Fix form validation accessibility in ConfigForm.tsx (2 fields) (Phase 2.3)
- [x] Fix module-voice route import paths (Phase 1.2) - Changed `@{project}/` → `@{{PROJECT_NAME}}/`
- [x] Created placeholder standards documentation (templates/README.md)
- [x] Added placeholder compliance validation (Portability Validator)
- [x] Synced all fixes to test-valid project
- [x] **Validation Results:**
  - **Before:** 2,245 errors, 343 warnings (Baseline)
  - **After:** 2,220 errors, 347 warnings
  - **Improvement:** ✅ **Eliminated 25 errors** (voice module accessibility fixes)

### Sprint 2: module-chat Validation Cleanup (HIGH PRIORITY - 1 day)
- [ ] Fix IconButton aria-labels in chat components (Phase 2.1)
- [ ] Fix module-chat route import paths (Phase 1.2)
- [ ] Fix module-chat TypeScript type errors (Phase 1.3)
- [ ] Fix hardcoded AWS regions in chat-stream Lambda (Phase 6.1)
- [ ] **Validation:** Run accessibility and TypeScript validators on chat module

### Sprint 3: Infrastructure & Supporting Modules (1 day)
- [ ] Fix UI Library validator path issue (Phase 5.1)
- [ ] Fix module-ai hardcoded AWS regions (Phase 6.1)
- [ ] Fix module-kb ListDocumentsResponse type (Phase 1.3.1)
- [ ] Fix User sys_role type in sys/kb page (Phase 1.3.3)
- [ ] **Validation:** Full validation suite

### Sprint 4: module-eval & module-ws (DEFERRED - Active Development)
- [ ] **SKIP:** module-eval fixes (workspace integration in progress)
- [ ] **SKIP:** module-ws fixes (workspace integration in progress)
- [ ] Note: These will be addressed after workspace integration branch merges

---

## Template-First Workflow Enforcement

**CRITICAL RULE:** All fixes MUST be applied to templates FIRST.

### Fix Locations

| Error Type | Template Location | Test Project |
|------------|------------------|-----------------|
| TypeScript errors | `templates/_modules-*/frontend/` | `~/code/bodhix/testing/test-valid/ai-sec-stack/packages/module-*/` |
| Accessibility | `templates/_modules-*/frontend/components/` | Same as above |
| API routes | `templates/_modules-*/backend/lambdas/` | `~/code/bodhix/testing/test-valid/ai-sec-infra/lambdas/` |
| Lambda code | `templates/_modules-*/backend/` | Same as above |

### Sync Workflow

After each template fix:
```bash
# Use the sync script
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-valid/ai-sec-stack <filename>

# Verify in test project
cd ~/code/bodhix/testing/test-valid/ai-sec-stack
pnpm -r run type-check  # TypeScript validation
# OR
python validation/cora-validate.py --validators a11y  # Accessibility validation
```

---

## Success Metrics

### Bronze → Silver Certification
- [ ] TypeScript: 0 errors
- [ ] Accessibility: ≤10 errors
- [ ] Frontend Compliance: 0 errors
- [ ] API Tracer: 0 critical errors

### Silver → Gold Certification
- [ ] All validators pass
- [ ] Warnings reduced to <50
- [ ] Code deployable to production

---

## Notes & Decisions

### Decision Log

**2026-01-18:**
- ✅ Fixed tsconfig.json module path mappings (toolkit bug identified)
- ⏳ TypeScript now running, revealed 2,165 code errors
- ⏳ Accessibility errors are template-level, not project-specific

**2026-01-19 Morning:**
- ✅ Reprioritized to focus on module-voice and module-chat validation
- ✅ Deferring module-eval and module-ws fixes (active workspace integration development)
- ✅ Created validation-test-resolution branch
- ✅ Clarified: Core modules (kb, chat) are always included, never listed in config

**2026-01-19 Afternoon (Baseline Established):**
- ✅ Fixed web app tsconfig.json - added test file exclusions
- ✅ Fixed UI Library validator CLI - removed double `/scripts/scripts/` path bug
- ✅ Created test project test-valid with all modules
- ✅ Established baseline: 2,245 errors, 343 warnings
- ✅ TypeScript validation now runs successfully (2,170 errors visible)
- ✅ Committed infrastructure fixes to branch
- 🎯 **Ready for Sprint 1:** module-voice validation cleanup

**2026-01-19 Afternoon (Sprint 1 Complete):**
- ✅ Fixed all voice module accessibility issues (7 IconButton aria-labels, 1 heading hierarchy, 2 form validation)
- ✅ Fixed voice module route import paths (placeholder format bug: `@{project}/` → `@{{PROJECT_NAME}}/`)
- ✅ Created comprehensive placeholder standards documentation (templates/README.md)
- ✅ Enhanced Portability Validator with 4 new placeholder compliance patterns
- ✅ Synced all fixes to test-valid project
- ✅ **Validation after fixes:** 2,220 errors, 347 warnings (eliminated 25 errors)
- 🎯 **Next:** Sprint 2 - module-chat validation cleanup

### Open Questions

1. **Orphaned Routes:** Should we keep all voice/eval/ws routes even if frontend doesn't call them yet?
2. **Type Errors:** Are module-eval routes using the wrong type? Need to verify UserOrganization shape.
3. **Accessibility:** Should we create a bulk fixer script or fix manually?

### Tools to Create

- [ ] Bulk aria-label adder for IconButtons
- [ ] Orphaned route inventory generator
- [ ] Template validation pre-commit hook
