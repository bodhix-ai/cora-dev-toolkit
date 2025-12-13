# Session 4 Context: Import Validator - Backend Implementation

**Previous Session:** Schema Validator (COMPLETE)  
**Current Session:** Session 4 - Import Validator (Backend)  
**Date:** November 25, 2025  
**Estimated Duration:** 3-4 hours

---

## Quick Start - What You Need to Know

### Current Status

- ✅ **Schema Validator COMPLETE** - 175 queries validated, 75 errors detected
- 🎯 **Next Tool:** Import Validator (Backend + Frontend)
- 📋 **This Session:** Backend Python import validation

### What Needs to Be Built

1. **Backend Import Validator** - Validates Python Lambda function imports
2. **Signature Validator** - Checks function signatures and parameters
3. **Error Detection** - Detects incorrect module names, wrong parameters

---

## Why This is Critical

**Phase 0 Deployment Failure** (November 24, 2025):
- **ai-enablement-module**: `find_one(error_if_not_found=True)` failed
- Error: `error_if_not_found` parameter doesn't exist
- Impact: 500 errors on all AI enablement endpoints
- Debugging time: 2+ hours

**Solution:** Pre-deployment validation catches these errors in <1 minute.

---

## Implementation Tasks

1. **Setup** (15 min) - Create project structure
2. **Import Parser** (1-1.5 hrs) - Extract imports and function calls via AST
3. **Signature Loader** (1 hr) - Load actual module signatures
4. **Validator** (1 hr) - Compare calls vs signatures
5. **CLI** (30 min) - Command-line interface
6. **Testing** (30 min) - Test against known errors

---

## Key Modules to Validate

- `org_common.common` - find_one, find_many, create, update, delete
- `org_common.auth` - get_user_id_from_token, verify_org_membership
- `org_common.validation` - validate_uuid, validate_required_fields

---

## Success Criteria

✅ Detects invalid parameter: `error_if_not_found` in find_one
✅ Detects deprecated parameter: `order_by` → should be `order`
✅ CLI produces JSON output for automation
✅ Validates all Lambda functions in packages/

---

## Reference

**Full Implementation Plan:** `pm-app-stack/docs/implementation/phase-1-validation-tools-implementation-plan.md`

**Session 4 Details:** See "Session 4: Module Import Validator - Backend" section

---

Ready to build! 🚀
