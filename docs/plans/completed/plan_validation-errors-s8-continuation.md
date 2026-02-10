# CORA Validation Errors - Sprint S8 Continuation Plan

**Status:** 📋 PLANNED  
**Branch:** `feature/validation-errors-s8`  
**Created:** February 9, 2026  
**Context:** `memory-bank/context-error-remediation.md`  
**Parent Plan:** `docs/plans/plan_validation-errors-s8.md`  
**Current Focus:** Phase 4+ Error Remediation (Post-Auth Fix)

---

## 📊 Current State (Feb 9, 2026 1:33 PM)

**Validation Baseline:**
- **Total Errors:** 465
- **Total Warnings:** 414
- **Certification:** BRONZE
- **Validators Passing:** 9/18
- **Validators Failing:** 9/18
- **Test Project:** `/Users/aaron/code/bodhix/testing/admin-s8/ai-mod-stack`

**Validators Passing (9):**
- structure ✅
- portability ✅
- a11y ✅
- import ✅
- schema ✅
- external_uid ✅
- rpc_function ✅
- nextjs_routing ✅
- module_toggle ✅

**Validators Failing (9):**
- api ❌
- cora ❌
- frontend ❌
- api_response ❌
- db_naming ❌
- ui_library ❌
- typescript ❌
- audit_columns ❌
- admin_routes ❌

**Top Error Categories:**
1. Code Quality: 411 occurrences (largest category)
2. Orphaned Route: 210 occurrences (warnings - route validation)
3. Schema: 92 occurrences (warnings - parser noise)
4. Accessibility: 30 occurrences (warnings - validator passes)
5. Workspace Plugin: 29 occurrences (warnings)
6. CORA Compliance: 21 occurrences (2 errors + 19 warnings)
7. Missing Lambda Handler: 16 occurrences
8. Portability: 15 occurrences (warnings - validator passes)
9. Database Naming: 14 occurrences
10. Db Table Not Found: 8 occurrences

---

## 🎯 S8 Accomplishments to Date

**Phase 1 Complete:** Org Admin Tabbed Interface ✅
- Org admins now have 5-tab interface at `/admin/org/access`
- Parity with sys admin organization management achieved

**Error Categories Eliminated:**
- **Auth:** 18 → 0 errors (100% reduction) ✅
- **Schema:** 2 → 0 errors (validator PASSES) ✅
- **Accessibility:** 24 → 0 errors (validator PASSES) ✅
- **Portability:** 0 errors (validator PASSES - 15 warnings only) ✅

**Net Progress:**
- **Starting (S7 baseline):** 507 errors
- **Current:** 465 errors
- **Reduction:** -42 errors (-8.3%)
- **Validators Fixed:** 4 validators now pass (a11y, schema, plus portability already passed)

---

## 📋 Phase 4: Quick Wins (Estimated: 4-6 hours)

**Objective:** Eliminate small error categories to build momentum and improve certification path.

### Phase 4.1: Missing Lambda Handler (16 errors) - 2 hours

**Investigation Required:**
- Category appears in summary but not in api.json query results
- Likely in a different validator output or different category name
- Need to identify which Lambdas are affected

**Approach:**
1. Run API tracer with verbose output to identify source
2. Check if errors are in lambda-auth-validator instead of api-tracer
3. Identify affected modules and Lambdas
4. Add missing route handler documentation
5. Re-validate

**Expected Outcome:** 16 → 0 errors

---

### Phase 4.2: Frontend Compliance (7 errors) - 1 hour

**Known Issues:**
- 2 errors in module-kb (frontend compliance)
- Likely component architecture violations

**Approach:**
1. Run frontend-compliance-validator to get error details
2. Fix component architecture violations
3. Sync to templates
4. Re-validate

**Expected Outcome:** 7 → 0 errors

---

### Phase 4.3: API Response (4 errors) - 1 hour

**Known Issues:**
- 4 errors in module-eval-studio (API response)
- Likely response format violations

**Approach:**
1. Run api-response-validator to get error details
2. Fix API response formats
3. Sync to templates
4. Re-validate

**Expected Outcome:** 4 → 0 errors

---

### Phase 4.4: Small Categories (5 errors) - 1 hour

**Categories to Fix:**
- TypeScript: 1 error
- UI Library: 1 error
- Route Matching: 1 error
- CORA Compliance: 2 errors (orphan module-cha bug)

**Approach:**
1. Fix TypeScript error (identify and fix)
2. Fix UI Library error (likely MUI compliance)
3. Fix Route Matching error (route configuration)
4. Fix CORA Compliance errors (module-cha orphan directory)
5. Re-validate

**Expected Outcome:** 5 → 0 errors

---

**Phase 4 Summary:**
- **Target:** 32 errors eliminated
- **New Total:** 465 → 433 errors (-7%)
- **Certification Impact:** Still Bronze, but trending toward Silver

---

## 📋 Phase 5: Database Integrity (Estimated: 3-4 hours)

**Objective:** Fix all database-related errors (14 total).

### Phase 5.1: Database Naming (4 errors + 4 warnings)

**Known Issues:**
- 3 errors in module-voice
- 1 error in module-eval
- ADR-011 naming standard violations

**Approach:**
1. Run db-naming-validator with details
2. Identify table/column naming violations
3. Fix in templates (ensure ADR-011 compliance)
4. Sync to test project
5. Re-validate

**Expected Outcome:** 4 errors → 0

---

### Phase 5.2: Db Table Not Found (8 errors)

**Known Issues:**
- 5 errors in module-ws
- 3 errors in module-mgmt
- Tables referenced but not created

**Approach:**
1. Identify missing tables from error details
2. Determine if tables should exist or references should be removed
3. Add missing tables or fix references
4. Sync to templates
5. Re-validate

**Expected Outcome:** 8 errors → 0

---

### Phase 5.3: Db Table Naming (2 errors)

**Known Issues:**
- 2 errors in module-ws
- Table naming convention violations

**Approach:**
1. Fix table naming to match ADR-011
2. Sync to templates
3. Re-validate

**Expected Outcome:** 2 errors → 0

---

**Phase 5 Summary:**
- **Target:** 14 errors eliminated
- **New Total:** 433 → 419 errors (-3%)
- **Certification Impact:** Database integrity improved

---

## 📋 Phase 6: Framework Compliance (Estimated: 4-5 hours)

**Objective:** Fix CORA compliance and admin routes errors (5 errors + 48 warnings).

### Phase 6.1: CORA Compliance (2 errors + 19 warnings)

**Known Issues:**
- 2 errors: Orphan `module-cha` directory (truncated module-chat)
  - Bug in `create-cora-project.sh` script
- 19 warnings: Missing barrel exports across 9 modules
  - `frontend/admin/index.ts`
  - `hooks/index.ts`

**Approach:**
1. Fix `create-cora-project.sh` script (module name truncation bug)
2. Create barrel exports for all 9 modules:
   - `frontend/admin/index.ts` in each module
   - `hooks/index.ts` in each module
3. Sync to templates
4. Re-validate

**Expected Outcome:** 2 errors → 0, 19 warnings → 0

---

### Phase 6.2: Admin Routes (3 errors)

**Known Issues:**
- All 3 errors in module-eval-opt
- `/api` prefix anti-pattern (build artifacts)
- Out of scope for S8 (eval-opt not in core modules)

**Approach:**
- Document as known issue
- Defer to eval-opt module remediation sprint
- Focus on core modules

**Expected Outcome:** Deferred (out of scope)

---

### Phase 6.3: Workspace Plugin (29 warnings)

**Known Issues:**
- 18 errors: Missing `getPluginConfig` export + plugin registration
- 11 warnings: Missing optional metadata
- Only 3 modules (chat, eval, kb) have `plugin-config.ts`
- 6 modules need plugin-config.ts created

**Approach:**
1. Review ADR-017 workspace plugin architecture
2. Create `plugin-config.ts` for 6 modules missing it
3. Add `getPluginConfig` exports
4. Add plugin registration
5. Add optional metadata (version, dependencies, sidebar)
6. Sync to templates
7. Re-validate

**Expected Outcome:** 29 warnings → 0

---

**Phase 6 Summary:**
- **Target:** 2 errors + 48 warnings eliminated
- **New Total:** 419 → 417 errors (-0.5%)
- **Certification Impact:** Framework compliance significantly improved

---

## 📋 Phase 7: Code Quality Remediation (Estimated: 12-16 hours)

**Objective:** Systematically reduce Code Quality errors (411 total).

**Challenge:** Largest error category, requires methodical approach.

### Phase 7.1: Analysis & Categorization (2 hours)

**Approach:**
1. Run code quality validator with detailed output
2. Categorize errors by type:
   - Linting violations
   - Code style issues
   - Best practice violations
   - Type safety issues
3. Identify systematic patterns (e.g., same error across multiple modules)
4. Prioritize by impact and ease of fix

**Output:** Categorized error list with priority order

---

### Phase 7.2: Systematic Fixes by Pattern (8-12 hours)

**Strategy:** Fix errors in batches by pattern, not by module.

**Example Pattern-Based Approach:**
1. **Batch 1:** Unused imports (if common)
2. **Batch 2:** Type safety violations (if common)
3. **Batch 3:** Console.log statements (if common)
4. **Batch 4:** Linting rule violations (if common)
5. **Batch 5:** Best practice violations (if common)

**For Each Batch:**
1. Fix pattern in all affected files
2. Sync to templates
3. Re-validate to measure progress
4. Document pattern fix for future reference

**Expected Outcome:** 411 → <200 errors (50%+ reduction)

---

### Phase 7.3: Module-Specific Cleanup (2-4 hours)

**Approach:**
- After pattern-based fixes, address module-specific issues
- Focus on modules with highest remaining error counts
- Apply module-specific fixes

**Expected Outcome:** <200 → <100 errors (additional 50% reduction)

---

**Phase 7 Summary:**
- **Target:** 311+ errors eliminated (75% reduction)
- **New Total:** 417 → <106 errors
- **Certification Impact:** Major improvement, approaching Silver threshold

---

## 📋 Phase 8: Route Validation (Estimated: 2-3 hours)

**Objective:** Reduce Orphaned Route warnings (210 total).

**Note:** These are warnings, not errors. Lower priority than errors.

### Phase 8.1: Analysis (1 hour)

**Approach:**
1. Review orphaned route warnings
2. Categorize:
   - Routes that should exist (need to be added)
   - Routes that shouldn't exist (need to be removed from config)
   - False positives (need validator tuning)

**Output:** Categorized route list

---

### Phase 8.2: Remediation (1-2 hours)

**Approach:**
1. Add missing route handlers
2. Remove invalid route configurations
3. Tune validator exclusion patterns
4. Re-validate

**Expected Outcome:** 210 → <50 warnings

---

**Phase 8 Summary:**
- **Target:** 160+ warnings eliminated
- **New Total:** 414 → <254 warnings
- **Certification Impact:** Route validation improved

---

## 📋 Phase 9: Final Validation & Certification (Estimated: 1-2 hours)

**Objective:** Verify all fixes, document results, achieve Silver certification.

### Phase 9.1: Full Validation

**Approach:**
1. Run complete validation suite
2. Document final error/warning counts
3. Compare to S8 baseline
4. Calculate improvement percentage
5. Verify certification level

**Expected Results:**
- **Total Errors:** <106 (from 465 = -77% reduction)
- **Total Warnings:** <254 (from 414 = -39% reduction)
- **Certification:** SILVER (target) or GOLD (stretch)
- **Validators Passing:** 14+/18 (from 9/18)

---

### Phase 9.2: Documentation & Handoff

**Approach:**
1. Update `memory-bank/context-error-remediation.md` with S8 results
2. Update `docs/plans/plan_validation-errors-s8.md` with completion status
3. Document patterns and lessons learned
4. Create S9 plan if additional work needed

**Deliverables:**
- S8 completion summary
- Lessons learned document
- S9 plan (if needed) or Silver certification achievement

---

## 🔗 Execution Strategy

**Recommended Approach:**
1. **Follow Phases Sequentially:** Complete Phase 4 before Phase 5, etc.
2. **Use Workflows:** Apply `/fix-cycle.md` workflow for each phase
3. **Validate After Each Phase:** Run full validation to track progress
4. **Template-First Always:** All fixes to templates, then sync to test project
5. **Document Patterns:** Record systematic fixes for future reference

**Estimated Total Time:** 28-38 hours across all phases

**Key Milestones:**
- Phase 4 Complete: <433 errors (-7%)
- Phase 5 Complete: <419 errors (-10%)
- Phase 6 Complete: <417 errors (-10%)
- Phase 7 Complete: <106 errors (-77%) **← SILVER CERTIFICATION THRESHOLD**
- Phase 8 Complete: <254 warnings
- Phase 9 Complete: S8 documented and closed

---

## ✅ Success Criteria

**Minimum (Bronze → Silver):**
- [ ] Total errors <150 (67% reduction)
- [ ] All quick-win categories eliminated (Phases 4-5)
- [ ] Code Quality <100 errors (75% reduction from 411)
- [ ] Certification: SILVER

**Stretch Goal (Silver → Gold):**
- [ ] Total errors <50 (89% reduction)
- [ ] Code Quality <20 errors (95% reduction from 411)
- [ ] Certification: GOLD

**Documentation:**
- [ ] All patterns documented
- [ ] S8 completion summary written
- [ ] Lessons learned captured
- [ ] Templates updated and validated

---

## 🚧 Key Safeguards

1. **Baseline First:** Validate before starting each phase
2. **One Phase at a Time:** Complete phase before moving to next
3. **Template-First:** Never fix only test project
4. **Validate After Each Fix:** Confirm improvement before proceeding
5. **Document Patterns:** Record systematic solutions
6. **Test Functionality:** Ensure fixes don't break features

---

## 🔗 Related Resources

- [Context: Error Remediation](../memory-bank/context-error-remediation.md)
- [S8 Plan](./plan_validation-errors-s8.md)
- [ADR-011: Table Naming Standards](../arch%20decisions/ADR-011-TABLE-NAMING-STANDARDS.md)
- [ADR-015: Audit Columns](../arch%20decisions/ADR-015-MODULE-ENTITY-AUDIT-COLUMNS.md)
- [ADR-017: WS Plugin Architecture](../arch%20decisions/ADR-017-WS-PLUGIN-ARCHITECTURE.md)
- [ADR-019: Auth Standardization](../arch%20decisions/ADR-019-AUTH-STANDARDIZATION.md)
- [Guide: Sprint Management](../guides/guide_SPRINT-MANAGEMENT.md)

---

## 📝 Next Steps

**Immediate:**
1. Review this continuation plan
2. Confirm approach and priorities
3. Begin Phase 4.1 (Missing Lambda Handler investigation)

**User Decision Points:**
- Approve phases 4-9 approach?
- Confirm Silver certification as minimum target?
- Adjust phase priorities if needed?
- Proceed with Phase 4.1 execution?
