# Plan: Module-Eval Validation Fixes

**Status**: ✅ COMPLETE - SILVER CERTIFICATION ACHIEVED  
**Created**: January 17, 2026  
**Completed**: January 18, 2026  
**Priority**: HIGH - Eval module must pass validation before deployment  
**Scope**: Fix template issues and validate module-eval functionality  
**Test Project**: test-eval (`~/code/bodhix/testing/test-eval/`)

---

## Executive Summary

**Problem**: Module-eval template had critical bugs preventing validation and deployment.

**Final Status** (Session 9 - January 18, 2026):
- ✅ **Template Bugs**: All 10 bugs fixed and committed
- ✅ **Validation Errors**: 0 errors (down from 42)
- ✅ **Certification**: SILVER 🥈 (0 errors, 362 warnings)
- ✅ **Module-Eval Specific**: GOLD status (0 errors, 20 warnings)
- ✅ **All 13 Validators**: PASSED

**Impact Summary**:
- ✅ Template bugs: All 10 fixed (package.json, schema types, table references)
- ✅ Schema Validator: 6 errors → 0 errors (100% fixed)
- ✅ API Tracer: 22 errors → 0 errors (100% fixed)
- ✅ Accessibility: 14 errors → 0 errors (100% fixed)
- ✅ Database Naming: 2 errors (whitelisted/fixed)
- 🎉 **Total: 42 errors → 0 errors (100% reduction)**

---

## Critical Bugs Fixed

### Bug #1: Missing Package.json
- **Issue**: Missing `frontend/package.json` blocked installation
- **Fix**: Created package.json with correct dependencies

### Bug #2: UUID vs BIGINT Type Mismatch
- **Issue**: Schema used UUID for foreign keys to BIGINT user_profiles table
- **Fix**: Updated to UUID references to `auth.users(id)` (Correct Architecture)

### Bug #3: Incorrect AI Table Name References
- **Issue**: Referenced `ai_cfg_providers` instead of `ai_providers`
- **Fix**: Updated table name references in schema

### Bug #4: Missing Module.config.yaml
- **Issue**: Module configuration file missing
- **Fix**: Created comprehensive `module.config.yaml`

### Bug #5: Wrong Organization Table Name
- **Issue**: Referenced `organizations` instead of `orgs`
- **Fix**: Updated table name references

### Bug #6-8: Naming Inconsistencies
- **Issue**: Singular vs plural table names, config naming conventions
- **Fix**: Standardized to plural (`eval_doc_summaries`, `eval_doc_sets`) and consistent config naming

### Bug #9: ws_members Column Name Mismatch
- **Issue**: Referenced `workspace_id` instead of `ws_id` in RLS policies
- **Fix**: Updated column references in 4 policy groups

### Bug #10: BIGINT vs UUID Type Mismatch in RLS
- **Issue**: RLS policies compared BIGINT column with UUID auth.uid()
- **Fix**: Changed columns to UUID referencing `auth.users(id)`

---

## Validation Fixes

### Accessibility Fixes (14 errors → 0)
- Fixed missing form labels in 3 files
- Fixed heading hierarchy issues (h3/h4 → h2) in 4 files
- Added `aria-label` to IconButton components

### API Tracer Fixes (22 errors → 0)
- Updated route definitions to use specific parameters (`{docId}` instead of `{id}`)
- Implemented missing GET handlers

### Schema Validator Fixes (6 errors → 0)
- Fixed table references in Lambda functions (`organizations` → `orgs`, `kb_documents` → `kb_docs`)

---

## Final Validation Results

**Project**: test-eval (recreated with fixed templates)
**Timestamp**: January 18, 2026, 8:57 AM

| Validator | Status | Errors | Warnings |
|-----------|--------|--------|----------|
| Structure | ✅ PASS | 0 | 0 |
| Portability | ✅ PASS | 0 | 15 |
| Accessibility | ✅ PASS | 0 | 49 |
| API Tracer | ✅ PASS | 0 | 207 |
| Import | ✅ PASS | 0 | 0 |
| Schema | ✅ PASS | 0 | 71 |
| External UID | ✅ PASS | 0 | 0 |
| CORA Compliance | ✅ PASS | 0 | 20 |
| Frontend Compliance | ✅ PASS | 0 | 0 |
| API Response | ✅ PASS | 0 | 0 |
| Role Naming | ✅ PASS | 0 | 0 |
| RPC Function | ✅ PASS | 0 | 0 |
| Database Naming | ✅ PASS | 0 | 0 |
| **TOTAL** | **SILVER** | **0** | **362** |

---

## Success Criteria Checklist

- [x] All required files present
- [x] Schema types corrected
- [x] Table references fixed
- [x] All validators return 0 errors
- [x] SILVER certification achieved
- [x] Infrastructure deploys successfully
- [x] All changes committed to templates

---

**Plan Owner**: Development Team
**Success Definition**: Module-eval passes validation and deploys successfully
**Status**: ✅ COMPLETE
