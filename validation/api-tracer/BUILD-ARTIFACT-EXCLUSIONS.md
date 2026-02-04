# API-Tracer Build Artifact Exclusions

**Created:** February 4, 2026  
**Context:** Sprint S5 - Key Consistency Error Investigation

## Problem Statement

During Sprint S5, the API-Tracer validator reported 703 key_consistency errors, 92% of total validation errors. Investigation revealed that the validator was scanning **build artifacts** instead of source code, generating false positive errors.

## Root Cause

Build artifacts (`.build/`, `dist/`, `.next/`) contain:
- **Bundled/concatenated Lambda code** with dependencies
- **Transpiled frontend code** from Next.js
- **Build transformations** (e.g., snake_case ↔ camelCase conversions)
- **Third-party library code** mixed with application code

These artifacts should NOT be validated as they:
1. Are not the source of truth (generated from source files)
2. May contain legitimate inconsistencies from bundling/transpilation
3. Include third-party code we don't control
4. Create overwhelming false positive noise

## Solution: Exclusion Patterns

Two files were updated to exclude build artifacts:

### 1. Lambda Parser (`lambda_parser.py`)

**File:** `validation/api-tracer/lambda_parser.py`  
**Method:** `parse_directory()`  
**Line:** ~150

```python
# Directories to skip (build artifacts, node_modules, etc.)
# .build, dist, build: Lambda build artifacts (bundled/concatenated code)
# .next: Next.js build artifacts (transpiled frontend code)
# node_modules: Frontend dependencies
# __pycache__, .venv: Python artifacts
skip_patterns = ['.build', '.next', 'node_modules', '__pycache__', '.venv', 'dist', 'build']
```

### 2. Full Stack Validator (`validator.py`)

**File:** `validation/api-tracer/validator.py`  
**Method:** `_validate_code_quality()`  
**Line:** ~750

```python
# Skip templates and build artifacts
# .build, dist, build: Lambda build artifacts (bundled/concatenated code)
# .next: Next.js build artifacts (transpiled frontend code)
# node_modules: Frontend dependencies
path_str = str(file_path)
if any(skip in path_str for skip in ['_module-template', '.build', '.next', 'node_modules', 'dist', 'build', '__pycache__', '.venv']):
    continue
```

## Exclusion Pattern Reference

| Pattern | Purpose | Applies To |
|---------|---------|------------|
| `.build/` | Lambda build artifacts (bundled Python with dependencies) | Backend |
| `.next/` | Next.js transpiled/bundled frontend code | Frontend |
| `dist/` | Distribution builds (various) | Both |
| `build/` | Generic build output directories | Both |
| `node_modules/` | NPM package dependencies | Frontend |
| `__pycache__/` | Python bytecode cache | Backend |
| `.venv/` | Python virtual environment | Backend |
| `_module-template/` | CORA module templates (not project code) | Both |

## Impact

**Before fix:**
- Total Errors: 881
- key_consistency: 703 (92% of errors)

**After fix:**
- Total Errors: 539 (⬇️ 342 errors eliminated, 39% reduction)
- key_consistency: 374 (⬇️ 329 false positives eliminated, 47% reduction)

**Verification:**
```bash
# Confirm no .build files in errors:
python3 validation/api-tracer/cli.py validate \
  --path /path/to/project \
  --prefer-terraform \
  --output json 2>/dev/null | \
  jq '.errors[] | select(.mismatch_type == "quality_key_consistency") | .lambda_file' | \
  grep -c ".build"
# Expected output: 0
```

## Best Practices

1. **Always validate source files, never build artifacts**
2. **Add new build directories to exclusion lists** as they're discovered
3. **Document why patterns are excluded** for future maintainers
4. **Test exclusions** by verifying 0 build artifact files in error reports

## Related

- **Sprint:** S5 - Validation Errors (Low-Hanging Fruit)
- **Plan:** `docs/plans/plan_validation-errors-s5.md`
- **Context:** `memory-bank/context-error-remediation.md`
- **Issue:** Build artifacts causing 700+ false positive key_consistency errors
- **Resolution:** Added comprehensive build artifact exclusions to both file discovery layers