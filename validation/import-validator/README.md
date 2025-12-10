# Module Import Validator - Backend

**Prevents deployment failures by validating Lambda function imports against actual module signatures.**

## Problem Solved

This tool prevents runtime import errors like the November 24, 2025 deployment failure:

```python
# ❌ This code passed all tests but failed in production:
result = find_one('profiles', {'user_id': user_id}, error_if_not_found=True)
#                                                    ^^^^^^^^^^^^^^^^^^^^^^
#                                                    This parameter doesn't exist!

# Production error:
# TypeError: find_one() got an unexpected keyword argument 'error_if_not_found'
```

**Impact:**

- 500 errors on all AI enablement endpoints
- 2+ hours debugging time
- No pre-deployment detection

**Solution:**
This validator catches such errors in <1 minute before deployment.

## Features

- ✅ Validates Lambda function imports against actual `org_common` signatures
- ✅ Detects unknown parameters (e.g., `error_if_not_found`)
- ✅ Detects deprecated parameters (e.g., `order_by` → `order`)
- ✅ Detects missing required parameters
- ✅ Provides actionable fix suggestions
- ✅ Multiple output formats (text, JSON, markdown)
- ✅ Exit code 1 on errors (CI/CD friendly)

## Installation

```bash
cd pm-app-stack/scripts/validation/import-validator
pip3 install -r requirements.txt
```

## Usage

### Basic Usage

```bash
# Validate all Lambda functions
python cli.py --path ../../packages/

# Validate specific module
python cli.py --path ../../packages/ai-enablement-module/backend/

# Validate single file
python cli.py --path ../../packages/ai-enablement-module/backend/lambdas/provider/lambda_function.py
```

### Output Formats

```bash
# Human-readable text (default)
python cli.py --path ../../packages/ --output text

# Verbose mode (show all files scanned)
python cli.py --path ../../packages/ --output text --verbose

# JSON (for CI/CD)
python cli.py --path ../../packages/ --output json

# Markdown (for PR comments)
python cli.py --path ../../packages/ --output markdown

# Summary only
python cli.py --path ../../packages/ --output summary
```

### List Available Functions

```bash
# List all org_common functions and their signatures
python cli.py list
```

## Example Output

### Success

```
Loading org_common module signatures...
Loaded 40 function signatures

Validating directory: ../../packages/

======================================================================
Module Import Validation Report
======================================================================

✅ All imports are valid!
```

### Error Detected

```
======================================================================
Module Import Validation Report
======================================================================

❌ 1 error(s) found

──────────────────────────────────────────────────────────────────────
ERRORS:
──────────────────────────────────────────────────────────────────────

Error #1:
  File: packages/ai-enablement-module/backend/lambdas/provider/lambda_function.py
  Line: 85
  Function: org_common.find_one
  Issue: Unknown parameter 'error_if_not_found'
  Your call: common.find_one('profiles', {'user_id': user_id}, error_if_not_found=True)
  Expected: find_one(table, filters, user_jwt=None, select='*')
  💡 Suggestion: Valid parameters are: table, filters, user_jwt, select

======================================================================
Status: FAILED
======================================================================
```

## Common Errors Detected

### 1. Unknown Parameter

```python
# ❌ ERROR: Parameter doesn't exist
result = common.find_one('profiles', {'user_id': user_id}, error_if_not_found=True)

# ✅ CORRECT: Use the actual signature
result = common.find_one('profiles', {'user_id': user_id})
if result is None:
    raise NotFoundError("Profile not found")
```

### 2. Deprecated Parameter

```python
# ❌ ERROR: order_by is deprecated
results = common.find_many('profiles', order_by='created_at.desc')

# ✅ CORRECT: Use 'order' instead
results = common.find_many('profiles', order='created_at.desc')
```

### 3. Missing Required Parameter

```python
# ❌ ERROR: Missing required 'table' parameter
result = common.find_one(filters={'id': user_id})

# ✅ CORRECT: Provide all required parameters
result = common.find_one('profiles', {'id': user_id})
```

## Validated Functions

### Database Operations (`org_common.db`)

- `find_one(table, filters, user_jwt=None, select="*")`
- `find_many(table, filters=None, user_jwt=None, select="*", order=None, limit=None, offset=None)`
- `insert_one(table, data, user_jwt=None)`
- `update_one(table, filters, data, user_jwt=None)`
- `delete_one(table, filters, user_jwt=None)`
- `execute_query(table, operation, user_jwt=None, filters=None, data=None, select="*", order=None, limit=None, offset=None, single=False)`

**⚠️ Deprecated Parameters:**

- `order_by` → Use `order` instead

### Validation Functions (`org_common.validators`)

- `validate_uuid(value, field_name="id")`
- `validate_email(email)`
- `validate_org_role(role)`
- `validate_global_role(role)`
- `validate_required(value, field_name)`
- `validate_string_length(value, field_name, min_length=None, max_length=None)`
- `validate_url(url, field_name="url")`
- `validate_boolean(value, field_name)`
- `validate_integer(value, field_name, min_value=None, max_value=None)`
- `validate_choices(value, field_name, choices)`

### Error Classes

- `NotFoundError`, `ValidationError`, `ForbiddenError`

### Response Helpers

- `success_response()`, `bad_request_response()`, `forbidden_response()`, etc.

## Integration with Development Workflow

### Pre-Commit Hook (Recommended)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Get staged Python files in Lambda directories
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep 'lambdas/.*\.py$')

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Run import validator
cd pm-app-stack/scripts/validation/import-validator
python cli.py --path ../../packages/ --output summary

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Import validation failed. Fix issues or use 'git commit --no-verify' to skip."
  exit 1
fi
```

### CI/CD Integration (GitHub Actions)

```yaml
name: Import Validation

on:
  pull_request:
    paths:
      - "pm-app-stack/packages/**/backend/**/*.py"

jobs:
  validate-imports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          cd pm-app-stack/scripts/validation/import-validator
          pip install -r requirements.txt

      - name: Validate imports
        run: |
          cd pm-app-stack/scripts/validation/import-validator
          python cli.py --path ../../packages/ --output markdown > validation-report.md

      - name: Post validation report
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('pm-app-stack/scripts/validation/import-validator/validation-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
```

## Testing the Validator

### Test Against Known Error

Create a test file with the known error:

```bash
# Create test file
cat > test_lambda.py << 'EOF'
import org_common as common

def test_function():
    # This should trigger an error
    result = common.find_one('profiles', {'user_id': 'test'}, error_if_not_found=True)
    return result
EOF

# Run validator
python cli.py --path test_lambda.py

# Should output:
# ❌ 1 error(s) found
# Error #1: Unknown parameter 'error_if_not_found'

# Clean up
rm test_lambda.py
```

## Exit Codes

- `0` - Validation passed (no errors)
- `1` - Validation failed (errors found)

## Performance

- **Signature Loading:** <1 second
- **Validation:** ~0.1 seconds per file
- **Total Time:** Typically <2 seconds for all Lambda functions

## Troubleshooting

### "org_common module not found"

The validator auto-detects the `org_common` module location. If it fails:

```bash
python cli.py --path ../../packages/ --base-path /absolute/path/to/pm-app-stack
```

### "No Python files found"

Ensure you're pointing to a directory with Lambda functions:

```bash
# ✅ CORRECT
python cli.py --path ../../packages/ai-enablement-module/backend/

# ❌ WRONG
python cli.py --path ../../packages/ai-enablement-module/frontend/
```

### False Positives

If you encounter false positives, please report them with:

- File path
- Line number
- Function call
- Expected behavior

## Development

### Project Structure

```
import-validator/
├── cli.py                 # CLI interface
├── signature_loader.py    # Load org_common signatures
├── backend_validator.py   # Validate Python imports
├── reporter.py           # Format validation results
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

### Adding New Deprecated Parameters

Edit `signature_loader.py`:

```python
def _get_deprecated_params(self, function_name: str) -> List[str]:
    deprecated_map = {
        'find_many': ['order_by'],  # Add new ones here
        'execute_query': ['order_by'],
    }
    return deprecated_map.get(function_name, [])
```

## Related Tools

- **Schema Validator** - Validates database queries against Supabase schema
- **API Tracer** - Validates full-stack API contracts

## License

Internal tool for PolicyMind development.

## Support

For issues or questions, contact the infrastructure team or create an issue in the repository.
