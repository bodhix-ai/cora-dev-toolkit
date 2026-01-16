# CORA Validation Suite

This workflow runs the full CORA validation suite and helps you fix issues.

## 1. Run Validation

Execute the validation suite:

```bash
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [ ! -f "./validation/cora-validate.py" ]; then
    echo "ERROR: Validation script not found at ./validation/cora-validate.py"
    echo "Are you in the correct directory? Expected: project root"
    exit 1
fi

# List available validators
python3 ./validation/cora-validate.py list

# Run project validation (specify the project path)
# For the toolkit itself:
python3 ./validation/cora-validate.py project . 2>&1 || {
    echo "ERROR: Validation script failed. Common causes:"
    echo "  - Missing Python 3"
    echo "  - Missing dependencies (run: pip install -r validation/requirements.txt)"
    echo "  - Invalid project structure"
    exit 1
}
```

## 2. Categorize Results

Parse the output and group errors by domain:

| Domain | Validators | Error Types |
|--------|------------|-------------|
| **Backend** | api-tracer, cora-compliance, role-naming | Lambda, API, Authorization |
| **Data** | db-naming, schema, rpc-function | Schema, Naming, RLS |
| **Frontend** | a11y, frontend-compliance | Accessibility, UI |
| **Structure** | structure, import, portability | Files, Imports |

## 3. Present Summary

Show a summary table with error counts per domain.

## 4. Task Recommendation

If errors span 2+ domains, output:

> You have **{X} errors across {N} domains**. This fix session may take multiple conversation turns.
>
> **Recommended**: Start a new Task for checkpoint support:
> "Start a task to fix the validation errors"

## 5. Suggested Next Steps

Present BOTH skill triggers AND fallback workflows:

**Option A: Natural Language (Skill Activation)**
Say one of the following to activate domain expertise:

| Domain | Say This | Expert Activated |
|--------|----------|------------------|
| **Backend** | "Fix the Lambda errors" or "Help with API routing" | `cora-toolkit-validation-backend` |
| **Data** | "Fix the database naming issues" or "Help with schema" | `cora-toolkit-validation-data` |
| **Frontend** | "Fix the accessibility errors" or "Help with a11y" | `cora-toolkit-validation-frontend` |
| **Structure** | "Fix the import violations" or "Help with file structure" | `cora-toolkit-validation-structure` |

**Option B: Direct Workflow (Guaranteed)**
If skills don't activate, use these commands directly:

| Domain | Workflow Command |
|--------|------------------|
| **Backend** | `/fix-backend.md` |
| **Data** | `/fix-data.md` |
| **Frontend** | `/fix-frontend.md` |
| **Structure** | `/fix-structure.md` |

**Need help?** Run `/help-validation.md` to see all available commands.

Which domain should I help you fix first?
