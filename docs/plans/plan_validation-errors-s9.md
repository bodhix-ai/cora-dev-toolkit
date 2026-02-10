# CORA Validation Errors - Sprint S9

**Status:** 🟡 IN PROGRESS  
**Branch:** `feature/validation-errors-s9`  
**Created:** February 9, 2026  
**Context:** `memory-bank/context-error-remediation.md`  
**Current Focus:** Remaining Error Categories (Code Quality, Database, Frontend, CORA)

---

## 📊 Executive Summary

Sprint S9 continues the systematic error remediation started in S8, focusing on the remaining error categories to achieve Silver certification.

**S8 Final State (2026-02-09 5:30 PM):**
- **Total Errors:** 204 (down from 507 baseline, -59.8% reduction)
- **Total Warnings:** 468
- **Certification:** BRONZE
- **Validators Passing:** 10/18

**S9 Starting Baseline (2026-02-09):**
- **Total Errors:** 204
- **Total Warnings:** 468
- **Certification:** BRONZE

**S9 Target Categories (Baseline Counts):**
1. **Code Quality** - 163 errors (response_format: ~18, import: ~13, other subcategories)
2. **Database-related** - 17 errors (Db Table Not Found: 8, Db Table Naming: 4, Database Naming: 4, Db Parameter Naming: 1)
3. **Frontend Compliance** - 7 errors (direct fetch() calls)
4. **Auth** - 7 errors (investigate if stale/residual)
5. **API Response** - 4 errors (non-standard response patterns)
6. **CORA Compliance** - 2 errors + 19 warnings (orphan module-cha bug + barrel exports)

**S9 Objectives:**
1. **Errors:** Reduce 204 → <100 errors (50%+ reduction)
2. **Certification:** Achieve Silver certification (target: <100 errors)
3. **Code Quality:** Complete remaining subcategories (response_format, import)
4. **Database:** Fix all naming violations (ADR-011 compliance)
5. **Frontend:** Eliminate direct fetch() calls (use API client pattern)

---

## 🎯 Scope

### 1. Code Quality Errors (163) - HIGHEST PRIORITY

**Remaining Subcategories:**
- **response_format** (~18 errors) - Snake_case in API responses
- **import** (~13 errors) - org_common signature mismatches
- **Other subcategories** (~132 errors) - To be identified

**S8 Achievement:** Eliminated 248 key_consistency false positives (380 → 0)

**S9 Approach:**
1. Run code-quality validator to categorize remaining 163 errors by subcategory
2. Fix response_format violations (snake_case → camelCase transforms)
3. Fix import signature mismatches
4. Address other subcategories systematically
5. Re-validate after each fix

**Success Criteria:**
- [ ] All response_format errors fixed (18 → 0)
- [ ] All import errors fixed (13 → 0)
- [ ] Remaining subcategories identified and prioritized
- [ ] 163 → <50 errors (70%+ reduction)

---

### 2. Database-related Errors (17) - ADR-011 COMPLIANCE

**Error Breakdown:**
- **Db Table Not Found** (8 errors) - Tables referenced but not found in schema
- **Db Table Naming** (4 errors) - Tables not following ADR-011 naming standards
- **Database Naming** (4 errors) - General naming violations
- **Db Parameter Naming** (1 error) - Parameter naming violation

**Likely Issues:**
- Missing table definitions in schema files
- Tables using wrong naming patterns (e.g., camelCase instead of snake_case)
- Missing module prefixes (should be `{module}_{entity}` pattern)
- Orphaned references to deleted/renamed tables

**Approach:**
1. Run db-naming validator for detailed error report
2. Identify missing tables vs naming violations
3. Fix table naming to follow ADR-011 standards
4. Remove orphaned references
5. Re-validate until zero errors

**Success Criteria:**
- [ ] All table naming follows ADR-011 standards
- [ ] All table references point to existing tables
- [ ] All parameter naming follows standards
- [ ] 17 → 0 errors (100% reduction)
- [ ] db-naming validator PASSES

---

### 3. Frontend Compliance Errors (7) - API CLIENT PATTERN

**Likely Issues:**
- Direct `fetch()` calls instead of using API client
- Missing error handling patterns
- Inconsistent API call patterns
- Not using `createAuthenticatedClient()`

**Approach:**
1. Run frontend-compliance validator for detailed error report
2. Identify all direct fetch() calls
3. Refactor to use `@{project}/api-client` pattern
4. Ensure proper error handling
5. Re-validate until zero errors

**Success Criteria:**
- [ ] All API calls use API client pattern
- [ ] No direct fetch() calls in frontend code
- [ ] Proper error handling implemented
- [ ] 7 → 0 errors (100% reduction)
- [ ] frontend-compliance validator PASSES

---

### 4. Auth Errors (7) - INVESTIGATE & VERIFY

**Status:** Potentially stale/residual errors from S8 auth fixes

**Approach:**
1. Run auth-pattern validator to get current error list
2. Verify if errors are real or stale cache
3. Investigate any legitimate auth pattern violations
4. Fix or confirm errors are false positives
5. Re-validate

**Success Criteria:**
- [ ] All auth errors investigated
- [ ] Real errors fixed or confirmed as validator bugs
- [ ] 7 → 0 errors (or documented as validator issues)

---

### 5. API Response Errors (4) - STANDARDIZATION

**Likely Issues:**
- Non-standard response format
- Missing required fields (success, data, error)
- Inconsistent error response patterns
- Missing HTTP status codes

**Approach:**
1. Run api-response validator for detailed error report
2. Identify non-compliant response patterns
3. Standardize to CORA response format
4. Ensure consistent error handling
5. Re-validate until zero errors

**Success Criteria:**
- [ ] All API responses follow standard format
- [ ] Consistent error response patterns
- [ ] 4 → 0 errors (100% reduction)

---

### 6. CORA Compliance (2 errors + 19 warnings) - FRAMEWORK

**Known Issues:**
- **Orphan module-cha** (2 errors) - Bug in `create-cora-project.sh` (truncates module-chat)
- **Barrel exports** (19 warnings) - Missing `admin/index.ts`, `hooks/index.ts` across 9 modules

**Approach:**
1. Fix create-cora-project.sh bug (module-cha → module-chat)
2. Add barrel export files to module templates
3. Ensure all modules have required exports
4. Re-validate

**Success Criteria:**
- [ ] create-cora-project.sh bug fixed (no more module-cha)
- [ ] All modules have barrel export files
- [ ] 2 → 0 errors (100% reduction)
- [ ] 19 warnings resolved

---

### 7. Other Categories (5 errors)

**Remaining Categories:**
- **UI Library** (1 error) - Non-standard UI component
- **TypeScript** (1 error) - Missing type properties
- **Admin Routes** (3 errors) - Out of scope (eval-opt module)

**Approach:**
1. Fix UI Library violation (use standard MUI components)
2. Fix TypeScript type error
3. Document admin routes errors as out of scope (eval-opt)
4. Re-validate

**Success Criteria:**
- [ ] UI Library: 1 → 0 errors
- [ ] TypeScript: 1 → 0 errors
- [ ] Admin Routes: Documented as out of scope

---

## 📝 Implementation Plan

### Phase 1: Code Quality - response_format (1-2 hours)

- [ ] Run code-quality validator with `--category=response_format` filter
- [ ] Identify all snake_case in API responses
- [ ] Apply camelCase transforms to response objects
- [ ] Sync fixes to test project
- [ ] Re-validate (18 → 0 errors)

### Phase 2: Code Quality - import (1 hour)

- [ ] Run code-quality validator with `--category=import` filter
- [ ] Identify org_common signature mismatches
- [ ] Fix import statements and function calls
- [ ] Sync fixes to test project
- [ ] Re-validate (13 → 0 errors)

### Phase 3: Code Quality - Remaining (2-3 hours)

- [ ] Categorize remaining 132 errors by subcategory
- [ ] Prioritize by error count
- [ ] Fix systematically by subcategory
- [ ] Re-validate after each category

### Phase 4: Database Errors (2-3 hours)

- [ ] Run db-naming validator for error details
- [ ] Fix table naming violations (ADR-011)
- [ ] Remove orphaned table references
- [ ] Fix parameter naming violations
- [ ] Re-validate (17 → 0 errors)

### Phase 5: Frontend Compliance (1-2 hours)

- [ ] Identify all direct fetch() calls
- [ ] Refactor to use API client pattern
- [ ] Add proper error handling
- [ ] Sync fixes to test project
- [ ] Re-validate (7 → 0 errors)

### Phase 6: Small Categories (1-2 hours)

- [ ] Investigate Auth errors (verify if stale)
- [ ] Fix API Response errors (4)
- [ ] Fix UI Library error (1)
- [ ] Fix TypeScript error (1)
- [ ] Re-validate

### Phase 7: CORA Compliance (1 hour)

- [ ] Fix create-cora-project.sh bug (module-cha)
- [ ] Add barrel export files to modules
- [ ] Re-validate (2 → 0 errors)

### Phase 8: Final Validation (1 hour)

- [ ] Run full validation suite
- [ ] Document error reduction per category
- [ ] Calculate total error reduction
- [ ] Verify Silver certification achieved

---

## ✅ Success Criteria

**Per-Category Targets:**
- [ ] Code Quality: 163 → <50 errors (70%+ reduction)
- [ ] Database: 17 → 0 errors (100% reduction)
- [ ] Frontend Compliance: 7 → 0 errors (100% reduction)
- [ ] Auth: 7 → 0 errors (or documented)
- [ ] API Response: 4 → 0 errors (100% reduction)
- [ ] CORA Compliance: 2 → 0 errors (100% reduction)
- [ ] Other: 4 → 0 errors (UI, TypeScript)

**Overall Targets:**
- [ ] Total errors: 204 → <100 (50%+ reduction)
- [ ] Certification: Bronze → **Silver** ✅
- [ ] Validators passing: 10/18 → 15/18
- [ ] Zero blocking errors for deployment

**Documentation:**
- [ ] All fixes documented in session notes
- [ ] Patterns captured in ADRs
- [ ] Validation reports archived

---

## 🚧 Key Safeguards

1. **Template-First:** All fixes to templates, then sync to test projects
2. **One Category at a Time:** Complete one category before moving to next
3. **Test After Each Fix:** Verify fixes don't break existing functionality
4. **Document Patterns:** Update ADRs and standards as patterns emerge
5. **Incremental Validation:** Run validators after each fix category

---

## 🔗 Related Resources

- [Context: Error Remediation](../memory-bank/context-error-remediation.md)
- [S8 Plan (Completed)](completed/plan_validation-errors-s8.md)
- [ADR-011: Table Naming Standards](../arch%20decisions/ADR-011-TABLE-NAMING-STANDARDS.md)
- [ADR-019: Auth Standardization](../arch%20decisions/ADR-019-AUTH-STANDARDIZATION.md)
- [Guide: Sprint Management](../guides/guide_SPRINT-MANAGEMENT.md)

---

## 📝 Session Notes

### Session 1: Sprint Setup (Feb 9, 2026)

**Actions:**
- Created S9 plan with remaining scope from S8
- Closed out S8 sprint
- Updated context-error-remediation.md

**Starting Baseline:**
- Total Errors: 204
- Total Warnings: 468
- Certification: BRONZE
- Validators Passing: 10/18

**Next Session:** Phase 1 - Code Quality response_format errors

---

**Plan Status:** 🟡 IN PROGRESS  
**Created:** February 9, 2026  
**Last Updated:** February 9, 2026