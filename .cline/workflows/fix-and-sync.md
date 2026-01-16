# Fix and Sync Workflow

This workflow automates the Template-First pattern for fast iteration.

**Usage**: `/fix-and-sync.md <filename>`

## 1. Locate Template Source

Find the template file that corresponds to the provided filename:

```bash
FILENAME="<filename>"
TEMPLATE=$(find templates/ -name "$FILENAME" -type f 2>/dev/null | head -1)

if [ -z "$TEMPLATE" ]; then
    echo "ERROR: Template not found for '$FILENAME'"
    echo "Search path: templates/"
    echo "Try: find templates/ -name '*partial-name*' -type f"
    exit 1
fi

echo "Found template: $TEMPLATE"
```

## 2. Apply Fix to Template

Edit the template file with the required fix.

**CRITICAL**: Always fix the TEMPLATE first, never just the test project.
Changes made only to test projects will be lost when the project is deleted.

## 3. Sync to Test Project

Determine the test project path from `memory-bank/activeContext.md` and sync:

```bash
# Read project paths from activeContext.md
# Stack path: for frontend and functional module code
# Infra path: for Lambda authorizer and infrastructure code

./scripts/sync-fix-to-project.sh <project-path> <filename>
```

### Path Patterns

| Code Type | Target Repo | Example |
|-----------|-------------|---------|
| Frontend components | `{project}-stack` | `InviteMemberDialog.tsx` |
| Functional module Lambda | `{project}-stack` | `module-access/invites/lambda_function.py` |
| Authorizer Lambda | `{project}-infra` | `lambdas/authorizer/lambda_function.py` |
| Terraform configs | `{project}-infra` | `main.tf`, `variables.tf` |

## 4. Deploy if Backend

If this is a Lambda file, deploy:

```bash
cd <project-infra-path> && ./scripts/deploy-lambda.sh <module>/<lambda>
```

## 5. Re-validate

Run the relevant validator to confirm the fix:

```bash
./validation/cora-validate.py --validators <relevant-validator>
```

## 6. Notify User

Tell the user:
- "✅ Fix applied to template and synced to test project"
- "Frontend: Restart dev server and retest"
- "Backend: Lambda deployed, retest the API"
