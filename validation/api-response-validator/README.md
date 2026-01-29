# API Response Format Validator

Validates that Lambda functions return camelCase responses according to CORA API standards.

## Purpose

Ensures all API responses follow the CORA standard:
- ✅ **Use camelCase** for response keys (`appName`, `createdAt`)
- ❌ **Avoid snake_case** in responses (`app_name`, `created_at`)

## Usage

### Standalone

```bash
cd cora-dev-toolkit/validation/api-response-validator
python validate_api_responses.py /path/to/project
```

### Integrated with CORA Validator

```bash
cd cora-dev-toolkit
python validation/cora-validate.py --check api-responses /path/to/project
```

## What It Checks

### 1. Import Validation (CRITICAL)
- **Missing org_common import** - All Lambdas MUST import org_common to access transformation utilities
- Without this import, responses will contain snake_case keys from the database

### 2. Transformation Usage
- **Missing format_records() calls** - Lambdas returning lists from DB operations should use `common.format_records()`
- Detects patterns like `users = common.find_many(...)` → `return common.success_response(users)` without transformation

### 3. Static Analysis
- **Response dictionaries** - Parses Lambda functions to find response dictionaries
- **Key naming** - Identifies snake_case keys that should be camelCase
- **Compliance** - Reports violations with line numbers and suggestions

### 4. Untransformed DB Data
- **Variables from DB operations** - Tracks variables assigned from `find_many()`, `find_one()`, etc.
- **Response usage** - Flags when DB variables are passed to `success_response()` without transformation

API Response Format Validation Results

Files checked: 5
Violations found: 2

❌ FAILED: Found snake_case keys in API responses

packages/module-access/backend/lambdas/orgs/lambda_function.py:
  Line 258: Snake_case key in response: app_name
           → Expected: 'appName'
  Line 259: Snake_case key in response: created_at
           → Expected: 'createdAt'

--------------------------------------------------------------------------------
Fix: Replace snake_case keys with camelCase in API responses
See: docs/standards/standard_API-PATTERNS.md
--------------------------------------------------------------------------------
```
## Example Output

```
API Response Format Validation Results

BACKEND (Lambda Functions):
  Files checked: 5
  Violations found: 3

❌ FAILED: Found 3 snake_case violations

packages/module-access/backend/lambdas/orgs/lambda_function.py:
  Line 1: Lambda missing org_common import - camelCase transformation unavailable
           → Expected: 'Add: import org_common as common'
  Line 258: Snake_case key in response: app_name
           → Expected: 'appName'
  Line 259: Snake_case key in response: created_at
           → Expected: 'createdAt'

packages/module-mgmt/backend/lambdas/lambda-mgmt/lambda_function.py:
  Line 145: Handler handle_list_functions() returns DB data without format_records() transformation
           → Expected: 'Add: transformed = common.format_records(db_results)'

--------------------------------------------------------------------------------
Fix: Replace snake_case with camelCase
  - Backend: Import org_common and use format_records() for DB data
  - Frontend: Access properties using camelCase
See: docs/standards/standard_API-PATTERNS.md
--------------------------------------------------------------------------------
```
================================================================================
API Response Format Validation Results
================================================================================

Files checked: 5
Violations found: 2

❌ FAILED: Found snake_case keys in API responses

packages/module-access/backend/lambdas/orgs/lambda_function.py:
  Line 258: Snake_case key in response: app_name
           → Expected: 'appName'
  Line 259: Snake_case key in response: created_at
           → Expected: 'createdAt'

--------------------------------------------------------------------------------
Fix: Replace snake_case keys with camelCase in API responses
See: docs/standards/standard_API-PATTERNS.md
--------------------------------------------------------------------------------
```

## False Positives

The validator ignores:
- **CONSTANT_CASE** - All uppercase with underscores (e.g., `API_KEY`)
- **PascalCase** - Starts with uppercase (e.g., `ClassName`)
- **Keys without underscores** - Already compliant

## Integration

This validator is automatically run as part of:
- `cora-validate.py` - Main validation orchestrator
- Pre-commit hooks (when configured)
- CI/CD pipeline (when configured)

## Standard Reference

See: `docs/standards/standard_API-PATTERNS.md` for the complete API naming convention standard.
