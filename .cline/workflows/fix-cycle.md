# CORA Fix Cycle

AI-driven iterative fix loop for resolving errors discovered during module testing.

**Usage:** Invoked automatically by `/test-module.md` when errors are detected.

**Can also be used directly:** `/fix-cycle.md` with error output pasted.

---

## Step 1: Error Categorization

Parse the error output and categorize by domain:

### Frontend Errors (TypeScript/React/Next.js)
- Type mismatches
- Missing imports
- Component prop errors
- Hook usage errors
- Build/compilation failures

### Backend Errors (Python/Lambda)
- Import errors
- Syntax errors
- Handler signature issues
- Missing dependencies
- Build script failures

### Infrastructure Errors (Terraform/AWS)
- Resource configuration errors
- Variable/output mismatches
- Provider issues
- State conflicts

### Data Errors (Database/Schema)
- Schema syntax errors
- RLS policy issues
- Migration failures
- Naming convention violations

---

## Step 2: Fix Templates FIRST

**CRITICAL:** All fixes must be applied to templates before syncing to test projects.

For each error:

### 2.1: Locate Template Source

```bash
# Example: Find template for a frontend component
find templates/ -name "ComponentName.tsx" -type f

# Example: Find template for a Lambda handler
find templates/ -name "lambda_function.py" -path "*module-kb*" -type f

# Example: Find template for infrastructure
find templates/_project-infra-template -name "*.tf" -type f
```

### 2.2: Apply Fix to Template

Edit the template file with the required fix.

**Template locations:**
| Code Type | Template Path |
|-----------|---------------|
| Core module frontend | `templates/_modules-core/module-{name}/frontend/` |
| Core module backend | `templates/_modules-core/module-{name}/backend/lambdas/` |
| Functional module frontend | `templates/_modules-functional/module-{name}/frontend/` |
| Functional module backend | `templates/_modules-functional/module-{name}/backend/lambdas/` |
| App shell components | `templates/_project-stack-template/apps/web/` |
| Infrastructure | `templates/_project-infra-template/` |

### 2.3: Log Fix in activeContext.md

Document each fix for future reference:

```markdown
#### Fix: [Component/File Name]
- **File:** `templates/path/to/file.tsx`
- **Error:** [Description of error]
- **Fix:** [Description of fix]
- **Status:** ✅ Applied
```

---

## Step 3: Sync Fixes to Test Project

After fixing templates, sync to the test project:

### 3.1: Frontend/Stack Fixes

```bash
# Sync frontend component
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-${WS_NUMBER}/ai-sec-stack ComponentName.tsx

# Sync with path pattern for specificity
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-${WS_NUMBER}/ai-sec-stack "module-kb/ComponentName.tsx"
```

### 3.2: Backend Lambda Fixes

```bash
# Module Lambdas go to STACK repo
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-${WS_NUMBER}/ai-sec-stack "module-kb/handler-name/lambda_function.py"
```

### 3.3: Infrastructure Fixes

```bash
# Infrastructure fixes go to INFRA repo
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-${WS_NUMBER}/ai-sec-infra "main.tf"
```

### 3.4: Handle Template Placeholders

If sync-fix-to-project.sh doesn't replace `{{PROJECT_NAME}}`:

```bash
# Manually replace in synced file
cd ~/code/bodhix/testing/test-ws-${WS_NUMBER}/ai-sec-stack
find . -name "affected-file.tsx" -exec sed -i '' 's/{{PROJECT_NAME}}/ai-sec/g' {} \;
```

---

## Step 4: Re-validate

After syncing fixes, re-validate based on error type:

### Frontend Re-validation

```bash
cd ~/code/bodhix/testing/test-ws-${WS_NUMBER}/ai-sec-stack
pnpm -r run type-check 2>&1
```

### Backend Re-validation

```bash
cd ~/code/bodhix/testing/test-ws-${WS_NUMBER}/ai-sec-stack/packages/module-{name}/backend
bash build.sh 2>&1
```

### Infrastructure Re-validation

```bash
cd ~/code/bodhix/testing/test-ws-${WS_NUMBER}/ai-sec-infra
terraform -chdir=envs/dev validate 2>&1
```

### Full Project Re-validation

```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit
python3 ./validation/cora-validate.py project ~/code/bodhix/testing/test-ws-${WS_NUMBER}/ai-sec-stack
```

---

## Step 5: Loop Decision

After re-validation:

**If errors remain:**
- Return to Step 1 with new error set
- Continue loop until clean

**If clean:**
- Return to calling workflow (`/test-module.md`)
- Proceed to next phase

---

## Batch Fix Strategy

For efficiency when multiple errors exist:

### Group by File
Fix all errors in the same file together before syncing.

### Group by Module
Fix all errors in the same module together, then rebuild once.

### Priority Order
1. Type/Interface definitions (fixes cascade to dependent files)
2. Shared utilities and hooks
3. Components
4. Pages/Routes

---

## Common Fix Patterns

### TypeScript Type Mismatch
```typescript
// Before: snake_case from API
data.field_name

// After: camelCase per API-PATTERNS standard
data.fieldName
```

### Missing Import
```typescript
// Add missing import
import { ComponentName } from '@ai-sec/module-kb';
```

### Lambda Handler Error
```python
# Check route docstring format
"""
Module Name - Description

Routes - Category:
- GET /path - Description
- POST /path/{id} - Description
"""
```

### Terraform Variable Missing
```hcl
# Add variable to module call
module "module_kb" {
  source = "../../../ai-sec-stack/packages/module-kb/infrastructure"
  
  # Add missing variable
  missing_var = var.missing_var
}
```

---

## Exit Conditions

This workflow exits when:

1. **All errors fixed:** Return success to calling workflow
2. **Unresolvable error:** Present to user for manual intervention
3. **User cancellation:** Stop fix cycle

---

## Tracking Progress

During fix cycles, maintain a running count:

```markdown
## Fix Cycle Progress

**Iteration:** 3
**Errors Found:** 12
**Errors Fixed:** 10
**Errors Remaining:** 2

| Error | Status |
|-------|--------|
| OrgMembersList.tsx type mismatch | ✅ Fixed |
| useKnowledgeBase.ts missing import | ✅ Fixed |
| kb-handler build failure | 🔄 In Progress |
| Terraform variable missing | ⏳ Pending |
