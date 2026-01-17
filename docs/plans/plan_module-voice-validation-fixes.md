# Plan: Module-Voice Validation Fixes

**Status**: 🔄 IN PROGRESS - Sprint 1 Partial (26 of 51 errors fixed)  
**Created**: January 17, 2026  
**Updated**: January 17, 2026 (Session 12 - Fresh Validation)  
**Priority**: CRITICAL - Voice module must pass validation before deployment  
**Scope**: Fix validation errors across module-voice templates  
**Test Project**: test-voice (`~/code/bodhix/testing/test-voice/ai-sec-stack`)

---

## Executive Summary

**Problem**: Module-voice template has 113 validation errors preventing deployment.

**Progress**: **26 of 139 errors fixed (19%)**

**Current Status**: Sprint 1 PARTIALLY COMPLETE. Structure and Schema validators PASSING. CORA Compliance, Accessibility, and Frontend Compliance remain.

**Test Results (test-voice - January 17, 2026, 2:25 PM - Fresh Project)**:
- ✅ **Database Schema: PROVISIONED** (45 tables, 146 RLS policies, 73 functions)
- ✅ **10 validators: PASSED** (Structure ✅, Schema ✅, API Response, Role Naming, External UID, RPC Function, DB Naming, Portability, API Tracer, Import)
- ❌ **CORA Compliance: 27 errors** (validator expects org_common, templates use access_common)
- ❌ **Accessibility: 32 errors** (missing labels, aria-labels, heading hierarchy)
- ❌ **Frontend Compliance: 50 errors** (IconButton aria-labels, direct fetch usage)

**Impact**: 
- ✅ Structure and Schema validators FIXED (26 errors resolved)
- ❌ 113 errors remain (27 CORA + 32 accessibility + 50 frontend + 4 warnings escalated)
- Certification: BRONZE (was FAILED, now passing 10 of 13 validators)

**Goal**: Complete remaining Sprint 1 CORA fixes + Sprint 2 to achieve GOLD certification.

---

## Error Summary by Validator

| Validator | Original | Fixed | Remaining | Priority | Status |
|-----------|----------|-------|-----------|----------|--------|
| **Structure** | 1 | 1 | 0 | CRITICAL | ✅ COMPLETE |
| **Schema** | 25 | 25 | 0 | CRITICAL | ✅ COMPLETE |
| **CORA Compliance** | 27 | 0 | 27 | CRITICAL | ⏳ Pending |
| **Accessibility** | 32 | 0 | 32 | HIGH | ⏳ Pending |
| **Frontend Compliance** | 50 | 0 | 50 | MEDIUM | ⏳ Pending |
| **Other (Warnings)** | 4 | 0 | 4 | LOW | ⏳ Pending |
| **Total** | **139** | **26** | **113** | - | **19% Complete** |

**Note**: Structure + Schema FIXED in Session 12. CORA Compliance investigation needed (validator naming mismatch).

---

## Implementation Order

### ⏳ Sprint 1: Critical Validators (3-4 hours)

**Priority**: CRITICAL - Must fix before production  
**Status**: Not started  
**Errors**: 51 (1 structure + 25 schema + 25 CORA compliance)

#### 1. Structure Error (15 min)

**Issue**: Missing `package.json` in `templates/_modules-functional/module-voice/`

**File to Create**: `templates/_modules-functional/module-voice/package.json`

**Solution**: Create package.json with proper module metadata
- Module name: `@{project}/module-voice`
- Version: Match other modules
- Dependencies: React, MUI, etc.
- Scripts: build, test, type-check

**Estimated Time**: 15 minutes

---

#### 2. Schema Errors (1-1.5 hours)

**Issue**: All 5 voice Lambda functions reference non-existent column `active` in `org_members` table.

**Error Pattern**: 
```python
membership = access.find_one('org_members', {
    'org_id': org_id, 
    'user_id': user_id, 
    'active': True  # ❌ Column doesn't exist
})
```

**Available Columns in org_members**: `id`, `org_id`, `user_id`, `org_role`, `added_by`, `created_at`

**Solution**: Remove `'active': True` from all org_members queries

**Affected Files** (25 occurrences total):
1. `voice-configs/lambda_function.py` - 5 occurrences (lines 108, 153, 203, 266, 342)
2. `voice-credentials/lambda_function.py` - 5 occurrences
3. `voice-sessions/lambda_function.py` - 5 occurrences
4. `voice-transcripts/lambda_function.py` - 5 occurrences
5. `voice-analytics/lambda_function.py` - 5 occurrences

**Fix Pattern**:
```python
# Before:
membership = access.find_one('org_members', {'org_id': org_id, 'user_id': user_id, 'active': True})

# After:
membership = access.find_one('org_members', {'org_id': org_id, 'user_id': user_id})
```

**Estimated Time**: 1-1.5 hours (5 files × 5 occurrences each)

---

#### 3. CORA Compliance Errors (1.5-2 hours)

**Issue**: All 5 voice Lambda functions missing CORA-compliant patterns:
- Missing `import access_common as access`
- No standard response functions
- No Okta→Supabase user mapping
- No database helper operations

**Affected Files**:
1. `voice-analytics/lambda_function.py`
2. `voice-configs/lambda_function.py`
3. `voice-credentials/lambda_function.py`
4. `voice-sessions/lambda_function.py`
5. `voice-transcripts/lambda_function.py`

**Required Changes per File**:

1. **Add access_common import**:
```python
import access_common as access
```

2. **Use standard response functions**:
```python
return access.success_response(data)
return access.error_response(message, status_code=400)
```

3. **Add Okta→Supabase mapping**:
```python
user_info = access.get_user_from_event(event)
user_id = access.get_supabase_user_id_from_external_uid(user_info['user_id'])
```

4. **Use database helpers**:
```python
# Replace direct SQL with:
access.find_one(table, filters)
access.find_many(table, filters)
access.insert_one(table, data)
access.update_one(table, id, data)
```

**Estimated Time**: 1.5-2 hours (5 files × 20-30 min each)

---

### ⏳ Sprint 2: Accessibility & Frontend Compliance (2-3 hours)

**Priority**: HIGH - Important for production readiness  
**Status**: Not started  
**Errors**: 30 (20 accessibility + 10 frontend compliance)

#### 4. Accessibility Errors (1.5-2 hours)

**Issue Categories**:

**A. Form Inputs Missing Labels** (~5 errors):
- `KbSelector.tsx` line 160 - Checkbox missing label
- `ConfigForm.tsx` multiple inputs - Using placeholder as label

**Solution**: Add proper `<label>` elements with `htmlFor` or `aria-label`

**B. TextFields Missing Labels** (~2 errors):
- `voice/page.tsx` line 131 - Search field missing label

**Solution**: Add `label` prop to TextField components

**C. IconButtons Missing aria-labels** (~8 errors):
- `voice/[id]/page.tsx` lines 165, 171, 232 - Refresh, Delete, etc.

**Solution**: Add descriptive `aria-label` to each IconButton

**D. Heading Level Skipped** (~1 error):
- `voice/page.tsx` line 187 - h4 → h6 (skipped h5)

**Solution**: Fix heading hierarchy (h4 → h5 → h6)

**E. Placeholder Not Label** (~4 warnings → errors):
- `ConfigForm.tsx` multiple textareas using placeholder

**Solution**: Add visible labels or aria-label

**Estimated Time**: 1.5-2 hours

---

#### 5. Frontend Compliance Errors (30-45 min)

**Issue**: Direct `fetch()` usage in admin pages instead of `createAuthenticatedClient`

**Affected Files**:
- `apps/web/app/admin/sys/kb/page.tsx` - lines 75, 108 (not voice-specific, skip)
- `apps/web/app/voice/[id]/page.tsx` - IconButtons missing aria-labels (covered in accessibility)

**Voice-Specific**: IconButton aria-labels already covered in accessibility section

**Estimated Time**: 30-45 min

---

## Implementation Strategy

### Template-First Workflow (CRITICAL)

**ALL fixes MUST be made to TEMPLATES first**, then synced to test project:

1. **Fix template**: `templates/_modules-functional/module-voice/`
2. **Sync to test**: `./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-voice/ai-sec-stack <filename>`
3. **Verify**: Re-run validation to confirm fix

**DO NOT fix test project directly** - those changes will be lost on next project creation.

---

## Session Tracking Template

### Session [N] (Date) - Status
**Focus**: [Sprint X - Validator Name]  
**Duration**: [X hours]  
**Errors Fixed**: [N] (Before → After)

**Deliverables**:
1. [Fix description]
2. [Fix description]

**Files Modified**:
1. `templates/_modules-functional/module-voice/[file]` - [change]
2. `templates/_modules-functional/module-voice/[file]` - [change]

**Validation Results**:
- [Validator]: [status]
- [Validator]: [status]

**Progress**: [X] of 81 errors fixed ([Y]%)

---

## Testing Strategy

### Test 1: Initial Validation (test-voice - January 17, 2026, 1:58 PM)

**Results**: 
- Total errors: 71 (estimated)
- Certification: FAILED
- Critical validators failing: 3 (Structure, Schema, CORA Compliance)

**Validator Results**:
- ❌ Structure: 1 error (missing package.json)
- ❌ Schema: 25 errors (org_members.active references)
- ❌ CORA Compliance: 25 errors (missing access_common)
- ❌ Accessibility: 20 errors (missing labels/aria-labels)
- ❌ Frontend Compliance: 10 errors (IconButton aria-labels)
- ✅ All other validators: PASSED

### Test 2: After Sprint 1 (Target)

**Expected Results**:
- Structure: ✅ PASSED (0 errors)
- Schema: ✅ PASSED (0 errors)
- CORA Compliance: ✅ PASSED (0 errors)
- Accessibility: ❌ 20 errors (unchanged)
- Frontend Compliance: ❌ 10 errors (unchanged)

**Progress**: 51 of 81 errors fixed (63%)

### Test 3: After Sprint 2 (Target)

**Expected Results**:
- All validators: ✅ PASSED (0 errors)
- Certification: GOLD
- Production ready: YES

**Progress**: 81 of 81 errors fixed (100%)

---

## Success Metrics

### Current (After Session 11 - January 17, 2026)
- ✅ Provisioning issues RESOLVED
- ✅ Database schema working
- ✅ RLS policies applied correctly
- ⏳ 0 of 81 template errors fixed (0%)

### After Sprint 1 Complete (Target)
- ✅ Structure errors resolved (1 of 1)
- ✅ Schema errors resolved (25 of 25)
- ✅ CORA compliance errors resolved (25 of 25)
- ✅ 51 of 81 errors fixed (63%)
- ⏳ Accessibility errors (20 remaining)
- ⏳ Frontend compliance errors (10 remaining)

### After Sprint 2 Complete (Target)
- ✅ 0 validation errors (100% reduction)
- ✅ GOLD certification
- ✅ Production deployment ready
- ✅ Template quality matches module-kb and module-chat standards

---

## Dependencies & Blockers

### Dependencies
- ✅ Module-voice template exists
- ✅ Test project created (test-voice)
- ✅ Validation suite working
- ✅ Database schema provisioned
- ✅ RLS policies working

### Blockers
- None currently

---

## Next Steps

1. ⏳ **Execute Sprint 1 (3-4 hours, 51 errors)**:
   - Fix missing package.json (15 min, 1 error)
   - Fix org_members.active references (1-1.5 hours, 25 errors)
   - Fix CORA compliance issues (1.5-2 hours, 25 errors)

2. ⏳ **Validate Sprint 1**: Re-run validation to confirm all critical errors fixed

3. ⏳ **Execute Sprint 2 (2-3 hours, 30 errors)**:
   - Fix accessibility issues (1.5-2 hours, 20 errors)
   - Fix frontend compliance (30-45 min, 10 errors)

4. ⏳ **Validate Sprint 2**: Re-run validation to achieve 0 errors

5. ⏳ **Continue with test-module.md workflow**:
   - Phase 2: Pre-deployment validation
   - Phase 3: Infrastructure deployment
   - Phase 4: Development server
   - Phase 5: Environment ready signal

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Template fixes break functionality | HIGH | LOW | Test after each fix, use sync-fix-to-project.sh |
| New errors introduced during fixes | MEDIUM | MEDIUM | Re-run full validation after each session |
| access_common integration breaking changes | MEDIUM | LOW | Follow patterns from module-kb and module-chat |
| Accessibility fixes causing UI regressions | LOW | LOW | Visual testing in dev server |

---

## Notes & Observations

### Session 10 (January 17, 2026) - Provisioning Fix
- **Achievement**: RESOLVED all database provisioning issues
- **Fix**: Created comprehensive RLS policies in `009-apply-rls.sql`
- **Impact**: Voice module can now be provisioned successfully
- **Remaining**: Only template quality issues (not infrastructure)

### Session 11 (January 17, 2026) - Initial Plan
- **Achievement**: Created comprehensive validation fix plan
- **Test**: test-voice-01 project created
- **Validation**: Estimated 71 errors across 5 validators
- **Ready**: Sprint 1 execution planned

### Session 12 (January 17, 2026) - Sprint 1 Partial Completion
- **Achievement**: Fixed Structure and Schema validators (26 errors)
- **Files Modified**: 
  1. Created `module-voice/frontend/package.json`
  2. Fixed 5 Lambda functions (25 org_members.active references removed)
- **Test**: Fresh test-voice project created with validation
- **Validation**: 113 errors found (higher than estimated)
  - ✅ Structure: PASSED (0 errors) - package.json fix worked
  - ✅ Schema: PASSED (0 errors) - org_members.active fixes worked
  - ❌ CORA Compliance: 27 errors (validator expects org_common, code uses access_common)
  - ❌ Accessibility: 32 errors (higher than estimated)
  - ❌ Frontend Compliance: 50 errors (much higher than estimated)
- **Progress**: 26 of 139 errors fixed (19%)
- **Certification**: BRONZE (10 of 13 validators passing)
- **Next**: Investigate CORA Compliance validator naming expectations

---

**Plan Owner**: Development Team  
**Estimated Duration**: 5-7 hours total (Sprint 1: 3-4h, Sprint 2: 2-3h)  
**Success Definition**: 0 validation errors, GOLD certification, production ready

**Created**: January 17, 2026  
**Updated**: January 17, 2026 (Session 12 - Sprint 1 Partial)  
**Status**: 26 of 139 errors fixed (19%), Structure & Schema complete, CORA/A11y/Frontend pending
