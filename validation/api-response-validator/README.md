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

1. **Static Analysis** - Parses Lambda functions to find response dictionaries
2. **Key Naming** - Identifies snake_case keys that should be camelCase
3. **Compliance** - Reports violations with line numbers and suggestions

## Example Output

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
