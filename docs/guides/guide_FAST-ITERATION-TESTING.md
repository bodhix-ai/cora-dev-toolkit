# Fast Iteration Testing Guide

This guide explains how to reduce testing cycle time when validating template fixes.

## Overview

Instead of the full workflow (delete project → recreate → deploy-all → start-dev), you can use targeted scripts to sync specific changes and reduce cycle time from ~5-7 minutes to ~30-60 seconds.

## Scripts

| Script | Location | Purpose |
|--------|----------|---------|
| `sync-fix-to-project.sh` | `cora-dev-toolkit/scripts/` | Copy template files to existing project |
| `deploy-lambda.sh` | `{project}-infra/scripts/` | Build and deploy single Lambda |

---

## sync-fix-to-project.sh

### Purpose
Copy changed template files to an existing test project without recreating the entire project.

### Usage
```bash
./scripts/sync-fix-to-project.sh <project-path> <template-file> [OPTIONS]
```

### Options
- `--dry-run` - Preview what would be copied without copying
- `--infra` - Target the -infra repo (for Lambda files)
- `--list` - Show common template paths
- `--help` - Show help message

### Examples

**Frontend component fix:**
```bash
# Sync InviteMemberDialog.tsx to test project
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-23/ai-sec-stack InviteMemberDialog.tsx

# Preview first with dry-run
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-23/ai-sec-stack InviteMemberDialog.tsx --dry-run
```

**Backend Lambda fix:**
```bash
# Sync orgs Lambda to infra project
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-23/ai-sec-infra "orgs/lambda_function.py"

# Use path pattern to narrow down results
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-23/ai-sec-infra "module-access/invites"
```

**List common paths:**
```bash
./scripts/sync-fix-to-project.sh --list
```

### How It Works

1. **File Search**: Searches templates for matching filename or path
2. **Module Detection**: Dynamically detects module name from path (e.g., `module-access`, `module-ai`)
3. **Path Mapping**: Maps template path to project path:
   - `_modules-core/module-{name}/frontend/...` → `packages/module-{name}/frontend/...`
   - `_modules-core/module-{name}/backend/lambdas/...` → `lambdas/module-{name}/...`
   - `_project-stack-template/...` → `...`

### Supported Template Types

| Template Type | Example Path | Destination |
|--------------|--------------|-------------|
| Core module frontend | `_modules-core/module-access/frontend/components/...` | `packages/module-access/frontend/components/...` |
| Core module Lambda | `_modules-core/module-access/backend/lambdas/invites/...` | `lambdas/module-access/invites/...` |
| Functional module frontend | `_modules-functional/module-ws/frontend/hooks/...` | `packages/module-ws/frontend/hooks/...` |
| App shell | `_project-stack-template/apps/web/components/...` | `apps/web/components/...` |
| Infra template | `_project-infra-template/scripts/...` | `scripts/...` |

---

## deploy-lambda.sh

### Purpose
Build and deploy a single Lambda function without running the full `deploy-all.sh` pipeline.

### Location
This script is in the project's infra repo: `{project}-infra/scripts/deploy-lambda.sh`

### Usage
```bash
./scripts/deploy-lambda.sh <lambda-name> [OPTIONS]
```

### Options
- `--env <env>` - Target environment (dev, stg, prd) - default: dev
- `--skip-build` - Skip build step (use existing zip)
- `--skip-upload` - Skip S3 upload
- `--auto-approve` - Skip Terraform approval prompt
- `--list` - List available Lambda functions
- `--help` - Show help message

### Examples

```bash
# Deploy invites Lambda
./scripts/deploy-lambda.sh module-access/invites

# Deploy authorizer
./scripts/deploy-lambda.sh authorizer

# Skip build, just redeploy existing zip
./scripts/deploy-lambda.sh module-access/invites --skip-build

# Deploy with auto-approve (CI/CD)
./scripts/deploy-lambda.sh module-ai/ai-config --auto-approve
```

---

## Workflow Examples

### Frontend-Only Fix (Fastest: ~30 seconds)

When fixing a TypeScript/React component:

```bash
# 1. Make fix in template (cora-dev-toolkit)
vim templates/_modules-core/module-access/frontend/components/org/InviteMemberDialog.tsx

# 2. Sync to test project
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-23/ai-sec-stack InviteMemberDialog.tsx

# 3. Restart dev server (in project directory)
cd ~/code/bodhix/testing/test-ws-23/ai-sec-stack
./scripts/start-dev.sh

# 4. Test in browser
```

### Backend Lambda Fix (~2-3 minutes)

When fixing a Lambda handler:

```bash
# 1. Make fix in template
vim templates/_modules-core/module-access/backend/lambdas/invites/lambda_function.py

# 2. Sync to test project
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-ws-23/ai-sec-infra "invites/lambda_function.py"

# 3. Build and deploy Lambda
cd ~/code/bodhix/testing/test-ws-23/ai-sec-infra
./scripts/deploy-lambda.sh module-access/invites

# 4. Test API endpoint
```

### Multiple Files (Same Module)

```bash
# Sync multiple files from same module
./scripts/sync-fix-to-project.sh ~/path/to/stack OrgMembersList.tsx
./scripts/sync-fix-to-project.sh ~/path/to/stack useOrgMembers.ts
./scripts/sync-fix-to-project.sh ~/path/to/stack "module-access/types"

# Restart dev server once
./scripts/start-dev.sh
```

---

## When to Use Full Workflow

Use the full workflow (`delete → recreate → deploy-all`) when:

1. **Template structure changes** - New files added, directories renamed
2. **Package dependencies change** - New npm packages added
3. **Infrastructure changes** - Terraform resources added/modified
4. **First-time setup** - No existing test project

---

## Troubleshooting

### "Multiple files found"
Provide a more specific path:
```bash
# Too generic
./scripts/sync-fix-to-project.sh ~/path lambda_function.py

# More specific
./scripts/sync-fix-to-project.sh ~/path "invites/lambda_function.py"
```

### "Template path structure not recognized"
The script only supports recognized patterns. Check `--help` for supported patterns.

### Changes not visible after sync
- **Frontend**: Restart dev server (`./scripts/start-dev.sh`)
- **Backend**: Rebuild and redeploy Lambda (`./scripts/deploy-lambda.sh`)

### Build errors after sync
The sync copies files exactly as they are. Ensure the template fix is correct before syncing.

---

## Best Practices

1. **Always use `--dry-run` first** when unsure about paths
2. **Update templates FIRST** - Never make changes only in test projects
3. **Test one fix at a time** - Easier to identify issues
4. **Commit template changes** - Before syncing, commit your template fixes
5. **Use path patterns** - More specific patterns reduce ambiguity
