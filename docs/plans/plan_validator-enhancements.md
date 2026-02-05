# Plan: Validator Enhancements (SQL & RPC)

**Status:** ✅ Phase 1 & 2 Complete  
**Priority:** High  
**Completed:** February 5, 2026  
**Total Effort:** ~4 hours  

---

## Progress Summary (Updated 2026-02-05)

**✅ Phase 1 Complete:**
1. DB Function Validator implementation (integrated into api-tracer)
2. RPC Parameter Naming standard (ADR-020)
3. Integrated validation reporting (module-level aggregation across all validators)

**✅ Phase 2 Complete:**
1. Validator Output Standardization - All 11 validators migrated
2. Shared utility module created (validation/shared/output_format.py)
3. Standard document created (05_std_quality_VALIDATOR-OUTPUT.md)
4. Module-level reporting with ASCII table format
5. Top Issues summary across all validators

**📋 Future Work:**
- CI/CD Integration (pre-commit hooks, GitHub Actions)
- Retroactive validation of all templates
- Performance optimization for large projects

---

## Latest Validation Results (2026-02-05)

**Test Project:** ws-optim (ai-mod-stack)

**Summary:**
- Total Errors: 560
- Total Warnings: 440
- Certification: BRONZE
- Validators Passed: 15/18 (83%)
- Validators Failed: 3 (a11y, api, audit_columns)

**Top Issues:**
1. Code Quality: 403 occurrences (mostly key consistency - delegated to API naming migration)
2. Orphaned Route: 238 occurrences (warnings, expected)
3. Route Matching: 144 errors (API tracer - needs review)
4. Schema: 83 warnings
5. Admin Routes: 30 warnings

**Module Breakdown:**
- module-access: 37 errors, 37 warnings
- module-ai: 29 errors, 13 warnings
- module-chat: 81 errors, 32 warnings
- module-eval: 89 errors, 13 warnings
- module-kb: 21 errors, 14 warnings
- module-mgmt: 25 errors, 41 warnings
- module-voice: 64 errors, 6 warnings
- module-ws: 45 errors, 7 warnings

---

## Implementation Status

### Phase 1: DB Function Validator & RPC Standards ✅ COMPLETE

**Duration:** ~2 hours (Feb 5, 2026)  
**Files Created:** 3  
**Files Modified:** 5

**Deliverables:**
1. ✅ DB Function Validator (`validation/api-tracer/db_function_validator.py`)
   - RPC parameter naming validation (p_ prefix)
   - Function naming pattern validation
   - Table reference validation (ADR-011)
   - Schema organization validation
   - Python helper location validation

2. ✅ RPC Parameter Naming Standard
   - ADR-020: RPC Parameter Naming
   - 04_std_data_RPC-FUNCTIONS.md implementation standard
   - Cross-references updated in ADR-019 and standards index

3. ✅ Integrated Validation Reporting
   - Module-level aggregation across ALL validators
   - ASCII table format for module summary
   - Top 10 issues summary
   - Severity breakdown (critical, high, medium, low)

### Phase 2: Validator Output Standardization ✅ COMPLETE

**Duration:** ~2 hours (Feb 5, 2026 Sessions 2 & 3)  
**Files Created:** 2  
**Files Modified:** 11 validators

**Deliverables:**
1. ✅ Standard Document (`docs/standards/05_std_quality_VALIDATOR-OUTPUT.md`)
   - Standard error/warning format
   - Module extraction rules (7 patterns)
   - Category taxonomy (10 categories)
   - Severity levels (critical, high, medium, low)
   - Implementation patterns and examples

2. ✅ Shared Utility Module (`validation/shared/output_format.py`)
   - `create_error()` - Standardized error creation
   - `create_warning()` - Standardized warning creation
   - `extract_module_from_path()` - Module name extraction
   - Module/category/severity aggregation functions
   - Full type hints and documentation

3. ✅ All 11 Validators Migrated:
   - a11y-validator
   - frontend-compliance-validator
   - structure-validator
   - portability-validator
   - typescript-validator
   - ui-library-validator
   - nextjs-routing-validator
   - admin-route-validator
   - workspace-plugin-validator
   - audit-column-validator
   - db-naming-validator

---

## Git Commits (2026-02-05)

**Branch:** `feature/validation-errors-s5`

1. **eb46d03** - fix(auth): update RPC calls to use p_ prefix for parameters (ADR-020 compliance)
2. **434dfcd** - fix(db): correct table name in is_eval_owner function (ADR-011 compliance)
3. **76b39b8** - feat(validation): add standard output format for all validators
4. **7350f85** - feat(validation): migrate remaining validators to standard output format
5. **e23051a** - feat(validation): add module-level reporting and ASCII table to orchestrator
6. **e184889** - docs: update validation plans with session 7 & 8 progress

**All commits pushed to remote:** ✅

---

## Key Achievements

### 1. Enhanced Error Detection
- DB function validator catches table naming errors before deployment
- RPC parameter validation prevents auth failures
- All validation gaps from 2026-02-04 incidents addressed

### 2. Improved Reporting
- Module-level aggregation enables targeted remediation
- ASCII table format provides clear visual summary
- Top Issues section prioritizes most common problems
- Severity levels enable better triage

### 3. Standardized Output
- All 11 validators use consistent format
- Standard fields: module, category, file, message, severity
- Enables cross-validator analysis and reporting
- Better integration with orchestrator

### 4. Documentation
- ADR-020: RPC Parameter Naming standards
- 04_std_data_RPC-FUNCTIONS.md: Implementation guide
- 05_std_quality_VALIDATOR-OUTPUT.md: Output format standard
- All cross-references updated

---

## Future Enhancements

### Priority 1: CI/CD Integration (1-2 hours)
- Add DB function validation to pre-commit hooks
- Add to GitHub Actions workflow
- Block merges on critical validation failures
- Configure severity thresholds

### Priority 2: Retroactive Validation (2-3 hours)
- Validate all templates in cora-dev-toolkit
- Fix any issues found
- Document findings and fixes
- Create migration guide for existing projects

### Priority 3: Performance Optimization (2-3 hours)
- Cache module extraction results
- Parallel validator execution
- Optimize file scanning
- Reduce memory footprint for large projects

### Priority 4: Enhanced Error Messages (1-2 hours)
- Include code context in errors
- Add fix suggestions for common issues
- Link to relevant standards/ADRs
- Improve error message clarity

---

## Related Documents

- `docs/arch decisions/ADR-020-RPC-PARAMETER-NAMING.md` ✅ Created
- `docs/standards/04_std_data_RPC-FUNCTIONS.md` ✅ Created
- `docs/standards/05_std_quality_VALIDATOR-OUTPUT.md` ✅ Created
- `docs/arch decisions/ADR-011-TABLE-NAMING-STANDARDS.md`
- `docs/arch decisions/ADR-019-AUTH-STANDARDIZATION.md`
- `memory-bank/context-error-remediation.md`
- `docs/plans/plan_validation-errors-s5.md`

---

## Success Metrics

### Before Enhancements:
- ❌ SQL function errors only discovered at runtime
- ❌ RPC parameter mismatches cause auth failures
- ❌ No documentation on RPC parameter naming
- ❌ Validators output inconsistent formats
- ❌ No module-level error aggregation
- ❌ Difficult to prioritize validation errors

### After Enhancements:
- ✅ SQL validation catches table name errors before deployment
- ✅ RPC parameter validation prevents auth errors
- ✅ Clear documentation prevents future mistakes
- ✅ All validators use standard output format
- ✅ Module-level aggregation enables targeted fixes
- ✅ Top Issues summary prioritizes remediation
- ✅ Severity levels enable better triage
- ✅ All templates can be validated

---

## Lessons Learned

1. **Proactive Validation:** Catching errors in validators is much cheaper than runtime failures
2. **Standardization:** Consistent output formats enable powerful aggregation and reporting
3. **Module-Centric:** Organizing errors by module aligns with CORA architecture
4. **Severity Levels:** Clear severity classification helps prioritize fixes
5. **Documentation:** Good standards documentation prevents future issues

---

**Status:** ✅ COMPLETE  
**Next Steps:** CI/CD integration, retroactive validation, performance optimization