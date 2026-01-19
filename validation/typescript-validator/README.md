# TypeScript Type Check Validator

**Part of CORA Validation Suite**

Validates TypeScript type correctness across all workspace packages to prevent type errors before deployment.

---

## Purpose

This validator runs `pnpm -r typecheck` across all packages in a CORA stack and parses the output to identify TypeScript type errors. It helps catch type mismatches, missing properties, and other TypeScript issues during the validation phase rather than at runtime or during manual testing.

## Why This Matters

1. **Prevention:** Catches type errors automatically before deployment
2. **Pre-Deployment Safety:** Prevents deploying code with type errors
3. **CI/CD Integration:** Can be integrated into automated build pipelines
4. **Developer Experience:** Provides faster feedback loop during development

## Usage

### Standalone Usage

```python
from typescript_validator import TypeScriptValidator

# Initialize validator
validator = TypeScriptValidator('/path/to/project-stack')

# Run validation
result = validator.validate()

# Check results
if result['passed']:
    print("✅ No type errors found")
else:
    print(f"❌ Found {result['error_count']} type errors")
    for error in result['errors']:
        print(f"{error['file']}:{error['line']} - {error['message']}")
```

### Integration with cora-validate.py

The validator is automatically integrated with the main validation orchestrator:

```bash
# Run all validators including TypeScript
cd validation
python cora-validate.py /path/to/project-stack

# Skip TypeScript validation
python cora-validate.py /path/to/project-stack --skip-typescript

# Run only TypeScript validation
python cora-validate.py /path/to/project-stack --only typescript
```

## Configuration

Configure via environment variables (set in `.env` or export):

```bash
# Fail on any type error (default: true)
TYPESCRIPT_STRICT_MODE=true

# Ignore template placeholder errors (default: true)
TYPESCRIPT_IGNORE_TEMPLATES=true

# Maximum allowed errors before failure (default: 0)
# Only applies when STRICT_MODE=false
TYPESCRIPT_MAX_ERRORS=0
```

## Output Format

### Success

```
✅ TypeScript validation passed - no type errors found
```

### Failure

```
❌ TypeScript validation failed - 16 type error(s) found:

📄 hooks/useKbDocuments.ts (1 error(s)):
  Line 86:34 - TS2339: Property 'documents' does not exist on type 'KbDocument[]'.

📄 hooks/useWorkspaceKB.ts (4 error(s)):
  Line 140:20 - TS2339: Property 'scope' does not exist on type 'AvailableKb'.
  Line 142:27 - TS2339: Property 'scope' does not exist on type 'AvailableKb'.
  ...
```

## Return Value

The `validate()` method returns a dictionary:

```python
{
    'passed': bool,           # True if validation passed
    'error_count': int,       # Number of errors found
    'errors': [               # List of error details
        {
            'file': str,      # Relative file path
            'line': int,      # Line number
            'column': int,    # Column number
            'code': str,      # TypeScript error code (e.g., TS2339)
            'message': str    # Error message
        },
        ...
    ],
    'warnings': [str]         # List of warning messages
}
```

## Prerequisites

The validator checks for these before running:

1. **package.json** - Must exist in the stack directory
2. **node_modules** - Dependencies must be installed (`pnpm install`)
3. **typecheck script** - All packages must have a `typecheck` script in their package.json

## Error Filtering

### Template Placeholders

When `TYPESCRIPT_IGNORE_TEMPLATES=true` (default), the validator filters out errors related to template placeholders:

- `@{{PROJECT_NAME}}`
- `{{project}}`
- `{{module}}`

These errors are expected in template files before project instantiation.

## Integration with Workflows

This validator is integrated with CORA workflows:

### Validation Workflow

```bash
# From .cline/workflows/validate.md
./validation/cora-validate.py /path/to/project-stack
```

### Fix Cycle Workflow

```bash
# From .cline/workflows/fix-cycle.md
# TypeScript errors are caught automatically during validation phase
```

## Common Type Errors

The validator catches errors like:

1. **Missing Properties:** `Property 'X' does not exist on type 'Y'`
2. **Type Mismatches:** `Type 'A' is not assignable to type 'B'`
3. **Wrong Argument Types:** `Argument of type 'X' is not assignable to parameter of type 'Y'`
4. **Missing Imports:** `Cannot find module 'X'`

## Performance

- **Timeout:** 5 minutes (configurable in code)
- **Typical Runtime:** 5-30 seconds depending on project size
- **Resource Usage:** Runs `tsc` in parallel across packages

## Error Codes

TypeScript error codes are preserved in the output:

- **TS2307:** Cannot find module
- **TS2322:** Type is not assignable
- **TS2339:** Property does not exist
- **TS2353:** Object literal may only specify known properties
- **TS2561:** Object literal may only specify known properties (strict)

See [TypeScript Error Reference](https://github.com/microsoft/TypeScript/blob/main/src/compiler/diagnosticMessages.json) for complete list.

## Troubleshooting

### "Prerequisites not met: missing package.json"

**Solution:** Run validator from the correct directory (project-stack root).

### "Missing node_modules"

**Solution:** Run `pnpm install` in the stack directory.

### "TypeScript typecheck timed out"

**Solution:** Check for infinite loops or very large projects. Increase timeout in code if needed.

### "No projects matched the filters"

**Solution:** Ensure packages have `typecheck` script defined in their package.json.

## Development

### Running Tests

```bash
# Test on a clean project (should pass)
python typescript_validator.py /path/to/clean/project

# Test on a project with known errors (should fail)
python typescript_validator.py /path/to/project/with/errors
```

### Adding New Features

1. Update `typescript_validator.py`
2. Update this README
3. Update `docs/guides/guide_VALIDATION-TOOLS-IMPLEMENTATION.md`
4. Test on real projects
5. Submit PR

## Related Documentation

- **Main Validation Guide:** `docs/guides/guide_VALIDATION-TOOLS-IMPLEMENTATION.md`
- **Implementation Plan:** `docs/plans/plan_module-kb-type-fixes.md`
- **ADR-012:** Validation Skills Strategy

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** January 18, 2026
