# Plan: Toolkit Validation Fixes

**Status**: ✅ COMPLETE  
**Date**: January 16, 2026  
**Completed**: January 16, 2026  
**Context**: Follow-up to validation skills implementation

---

## Summary

The validation skills and workflows are complete and working. Two validators needed enhancements to work properly when validating templates in cora-dev-toolkit (vs real projects with live databases). **Both issues have been resolved.**

---

## Issues Found & Resolved

### Issue 1: Import Validator - org_common Not Found ✅ FIXED

**File**: `validation/import_validator/signature_loader.py`

**Problem**: The `load_org_common_signatures()` function searched for `org_common` in project paths but not toolkit template paths.

**Solution**: Added parent directory traversal to find org_common in toolkit templates:
- Traverses parent directories looking for `templates/` directory
- When found, looks for org_common at toolkit root path

### Issue 2: Schema Validator - No Live DB for Templates ✅ FIXED

**Problem**: Schema Validator required database credentials to introspect actual DB schema. Templates don't have a live database.

**Solution**: Created static schema parsing mode:
1. New `static_schema_parser.py` parses CREATE TABLE statements from SQL files
2. Added `--static` flag to schema validator CLI
3. Added `--template-mode` flag to orchestrator that enables static mode

---

## Implementation Steps

### Phase 1: Quick Fix for Import Validator ✅ COMPLETE

1. [x] Open `validation/import_validator/signature_loader.py`
2. [x] Add toolkit fallback path with parent directory traversal
3. [x] Test: `python3 validation/cora-validate.py project templates/_project-stack-template --validators import`

### Phase 2: Schema Validator Template Mode ✅ COMPLETE

1. [x] Create `validation/schema-validator/static_schema_parser.py`
   - Parses CREATE TABLE statements from SQL files
   - Extracts table names, column names, column types
   - Returns schema dict matching live introspection format

2. [x] Modify schema validator CLI (`cli.py`) with `--static` flag:
   - Uses static schema parser when `--static` flag provided
   - No DB credentials required
   - Auto-detects toolkit schema location

3. [x] Test against template schemas - 26 tables parsed successfully

### Phase 3: Add Template Mode to Orchestrator ✅ COMPLETE

1. [x] Add `--template-mode` flag to `cora-validate.py`
2. [x] When enabled:
   - Import Validator: Uses toolkit fallback path for org_common
   - Schema Validator: Uses `--static` flag for SQL file parsing
   - Other validators work normally

---

## Validation Skills Created (Complete)

### Workflows (`.cline/workflows/`)
- `validate.md` - Main entry point
- `validate-backend.md` - Backend validators only
- `validate-frontend.md` - Frontend validators only
- `fix-backend.md` - Backend remediation (fallback)
- `fix-data.md` - Data remediation (fallback)
- `fix-frontend.md` - Frontend remediation (fallback)
- `fix-structure.md` - Structure remediation (fallback)
- `fix-and-sync.md` - Template-first fix workflow
- `help-validation.md` - Command reference

### Skills (`.cline/skills/`)
- `cora-toolkit-validation-backend/SKILL.md`
- `cora-toolkit-validation-data/SKILL.md`
- `cora-toolkit-validation-frontend/SKILL.md`
- `cora-toolkit-validation-structure/SKILL.md`

---

## Test Commands

```bash
# Standard validation (requires live database for schema validator)
python3 validation/cora-validate.py project templates/_project-stack-template

# Template mode (no database required) ✅ WORKING
python3 validation/cora-validate.py project templates/_project-stack-template --template-mode

# Individual validator tests
python3 validation/cora-validate.py project templates/_project-stack-template --validators import
python3 validation/cora-validate.py project templates/_project-stack-template --validators schema --template-mode
```

## Results After Fixes

With `--template-mode`:
- **All 13 validators pass** ✅
- Import Validator: ✅ PASSED (finds org_common in toolkit templates)
- Schema Validator: ✅ PASSED (uses static SQL parsing)
- Database Naming Validator: ✅ PASSED (filters out utility scripts)
- Certification: **SILVER** (1 accessibility warning)

---

## Key Files

| File | Purpose |
|------|---------|
| `validation/import_validator/signature_loader.py` | ✅ Fixed org_common path with parent traversal |
| `validation/schema-validator/static_schema_parser.py` | ✅ NEW - Static SQL schema parsing |
| `validation/schema-validator/cli.py` | ✅ Added --static flag |
| `validation/cora-validate.py` | ✅ Added --template-mode flag |
| `validation/db-naming-validator/cli.py` | ✅ Fixed import + filtered utility scripts |
| `templates/_modules-core/*/db/schema/*.sql` | Schema sources (26 tables) |
