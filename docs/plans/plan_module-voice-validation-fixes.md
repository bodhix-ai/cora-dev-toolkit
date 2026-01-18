# Plan: Module-Voice Validation Fixes

**Status**: 🔄 IN PROGRESS - Sprint 1 Complete (53 errors fixed)  
**Created**: January 17, 2026  
**Updated**: January 17, 2026 (Session 13 - CORA Compliance Fixed)  
**Priority**: CRITICAL - Voice module must pass validation before deployment  
**Scope**: Fix validation errors across module-voice templates  
**Test Project**: test-voice-05 (`~/code/bodhix/testing/test-voice-05-stack`)

---

## Executive Summary

**Problem**: Module-voice template had ~139 validation errors preventing deployment.

**Progress**: **53 errors fixed** (Structure, Schema, CORA Compliance complete)

**Current Status**: Sprint 1 COMPLETE. Sprint 2 (Frontend/Accessibility) queued.

**Test Results (test-voice-05 - January 17, 2026, 6:18 PM - Fresh Project)**:
- ✅ **CORA Compliance: PASSED (0 errors)** (Fixed in Session 13)
- ✅ **Structure: PASSED (0 errors)** (Fixed in Session 12)
- ✅ **Schema: PASSED (0 errors)** (Fixed in Session 12 - Note: 10 env errors due to missing creds)
- ✅ **Database Naming: PASSED (0 errors)**
- ❌ **Accessibility: 13 errors** (missing labels, aria-labels)
- ❌ **Frontend Compliance: 5 errors** (missing aria-labels, any types)

**Impact**: 
- ✅ All Backend/Infrastructure validators PASSED
- ❌ 18 frontend-related errors remain
- Certification: BRONZE (passing 11 of 13 validators)

**Goal**: Complete Sprint 2 to achieve GOLD certification.

---

## Error Summary by Validator

| Validator | Original | Fixed | Remaining | Priority | Status |
|-----------|----------|-------|-----------|----------|--------|
| **Structure** | 1 | 1 | 0 | CRITICAL | ✅ COMPLETE |
| **Schema** | 25 | 25 | 0 | CRITICAL | ✅ COMPLETE |
| **CORA Compliance** | 27 | 27 | 0 | CRITICAL | ✅ COMPLETE |
| **Accessibility** | 32 | 0 | 13 | HIGH | ⏳ Pending |
| **Frontend Compliance** | 50 | 0 | 5 | MEDIUM | ⏳ Pending |
| **Total** | **135** | **53** | **18** | - | **75% Complete** |

**Note**: Accessibility and Frontend error counts refined based on `test-voice-05` actual results.

---

## Implementation Order

### ✅ Sprint 1: Critical Validators (Completed)

**Priority**: CRITICAL - Must fix before production  
**Status**: COMPLETE  
**Errors Fixed**: 53

#### 1. Structure Error (Fixed)
- Created `package.json` in `frontend/`.

#### 2. Schema Errors (Fixed)
- Removed `active` column references from all 5 Lambdas.

#### 3. CORA Compliance Errors (Fixed)
- Updated all 6 voice Lambdas to use `org_common` instead of `access_common`.
- Fixed `voice-websocket` response format and auth patterns.
- Verified with `test-voice-05` project creation.

---

### ⏳ Sprint 2: Accessibility & Frontend Compliance (2-3 hours)

**Priority**: HIGH - Important for production readiness  
**Status**: Ready to Start  
**Errors**: 18 (13 accessibility + 5 frontend compliance)

#### 4. Accessibility Errors (1.5-2 hours)

**Issue Categories**:

**A. Form Inputs Missing Labels** (~2 errors):
- `KbSelector.tsx` line 160 - Checkbox missing label
- `voice/page.tsx` line 131 - Search field missing label

**B. Headings** (1 error):
- `voice/page.tsx` line 187 - Skipped heading level

**C. IconButtons Missing Labels** (~10 errors):
- `voice/[id]/page.tsx` - Multiple IconButtons
- `ConfigForm.tsx` - Inputs using placeholder as label

**Solution**: 
- Add `aria-label` to IconButtons
- Add `label` prop to TextFields
- Fix heading hierarchy

**Estimated Time**: 1.5-2 hours

---

#### 5. Frontend Compliance Errors (30-45 min)

**Issue**: 
- Missing `aria-label` on IconButtons (duplicates of Accessibility errors)
- `any` type usage in `InterviewRoom.tsx`

**Solution**:
- Fix aria-labels (covered by Accessibility task)
- Replace `any` with proper types or `unknown`

**Estimated Time**: 30-45 min

---

## Implementation Strategy

### Template-First Workflow (CRITICAL)

**ALL fixes MUST be made to TEMPLATES first**, then synced to test project:

1. **Fix template**: `templates/_modules-functional/module-voice/`
2. **Sync to test**: `./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-voice-05-stack <filename>`
3. **Verify**: Re-run validation to confirm fix

**DO NOT fix test project directly** - those changes will be lost on next project creation.

---

## Session Tracking

### Session 12 (Jan 17) - Sprint 1 Partial
- **Focus**: Structure & Schema
- **Fixed**: 26 errors
- **Status**: Structure & Schema Passing

### Session 13 (Jan 17) - Sprint 1 Complete
- **Focus**: CORA Compliance
- **Fixed**: 27 errors
- **Files**: All 6 voice Lambdas updated to `org_common`
- **Verification**: Created `test-voice-05`, validated 0 CORA errors
- **Status**: CORA Compliance Passing

---

## Next Steps

1. ⏳ **Execute Sprint 2 (Accessibility & Frontend)**:
   - Fix `KbSelector.tsx` and `voice/page.tsx` labels
   - Fix `voice/[id]/page.tsx` IconButtons
   - Fix `InterviewRoom.tsx` types

2. ⏳ **Validate Sprint 2**: Re-run validation on `test-voice-05` to achieve 0 errors.

3. ⏳ **Final Certification**: Confirm GOLD status.

---

**Plan Owner**: Development Team  
**Estimated Duration**: 2-3 hours remaining  
**Success Definition**: 0 validation errors, GOLD certification

**Created**: January 17, 2026  
**Updated**: January 17, 2026 (Session 13 - Sprint 1 Complete)  
**Status**: 53 of 71 errors fixed (75%), Backend passing, Frontend pending
