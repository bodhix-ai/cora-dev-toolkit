# Fix and Sync Workflow (Mono-Repo)

This workflow automates the Template-First pattern for mono-repo projects.

**Usage**: When fixing issues in the monorepo deployment project

## Context

**Current Monorepo Test Project:**
- Location: `/Users/aaron/code/bodhix/testing/mono-s1/ai-mod-stack/`
- Structure: Single repo with apps/, packages/, envs/, lambdas/, modules/

## Steps

### 1. Fix the Template FIRST

**CRITICAL**: Always fix the TEMPLATE first, never just the test project.
Changes made only to test projects will be lost when the project is deleted.

**Template locations:**
- Monorepo template: `templates/_project-monorepo-template/`
- Module templates: `templates/_modules-core/` or `templates/_modules-functional/`

### 2. Sync Fixed File to Test Project (WITH Placeholder Replacement)

**CRITICAL:** Use the `sync-mono-fix.sh` script to handle placeholder replacement.

**DO NOT use manual `cp`** - it copies placeholders like `{{PROJECT_NAME}}` without replacement!

```bash
# Use the sync script
./scripts/sync-mono-fix.sh <template-file> <test-project-path>
```

**Example commands:**

```bash
TEST_PROJECT="/Users/aaron/code/bodhix/testing/mono-s1/ai-mod-stack"

# Module frontend file
./scripts/sync-mono-fix.sh templates/_modules-core/module-ws/frontend/index.ts $TEST_PROJECT

# Web app tsconfig
./scripts/sync-mono-fix.sh templates/_project-monorepo-template/apps/web/tsconfig.json $TEST_PROJECT

# Admin page
./scripts/sync-mono-fix.sh templates/_project-monorepo-template/apps/web/app/admin/org/access/page.tsx $TEST_PROJECT

# Admin client page
./scripts/sync-mono-fix.sh templates/_project-monorepo-template/apps/web/app/admin/sys/SystemAdminClientPage.tsx $TEST_PROJECT
```

**What the script does:**
- ✅ Extracts project name from path (e.g., `ai-mod-stack` → `ai-mod`)
- ✅ Replaces `{{PROJECT_NAME}}` with actual project name
- ✅ Determines correct target path (apps/, packages/, etc.)
- ✅ Creates directories if needed

### 3. Rebuild Affected Modules

If you modified module files, rebuild them:

```bash
cd $TEST_PROJECT

# Rebuild specific module
pnpm --filter=module-ws build
pnpm --filter=module-access build
pnpm --filter=module-ai build

# Or rebuild all modules
pnpm run build
```

### 4. Test the Changes

**For frontend changes:**
```bash
cd $TEST_PROJECT/apps/web
pnpm run build  # Test production build
# OR
pnpm run dev    # Start dev server
```

**For backend/Lambda changes:**
```bash
cd $TEST_PROJECT
./scripts/deploy-lambda.sh <module>/<lambda>
```

### 5. Verify Success

Check that:
- ✅ Template was fixed first
- ✅ Fix was copied to test project
- ✅ Modules rebuilt successfully (if applicable)
- ✅ Web app builds without errors
- ✅ Tests pass

## Key Principles

1. **Template-First**: ALWAYS fix template before test project
2. **Use Sync Script**: ALWAYS use `./scripts/sync-mono-fix.sh` - handles placeholder replacement
3. **Never Use cp**: Manual `cp` leaves `{{PROJECT_NAME}}` unreplaced, causing build failures
4. **Rebuild**: Always rebuild affected modules after changes
5. **Test**: Verify the fix works in the test project

## Common File Types

| File Type | Template Location | Test Project Location |
|-----------|------------------|----------------------|
| Module frontend | `templates/_modules-core/<module>/frontend/` | `$TEST_PROJECT/packages/<module>/frontend/` |
| Web app page | `templates/_project-monorepo-template/apps/web/` | `$TEST_PROJECT/apps/web/` |
| Module Lambda | `templates/_modules-core/<module>/backend/` | `$TEST_PROJECT/packages/<module>/backend/` |
| Infrastructure | `templates/_project-monorepo-template/envs/` | `$TEST_PROJECT/envs/` |

## Sync Script for Monorepo vs Two-Repo

**For monorepo projects:** Use `./scripts/sync-mono-fix.sh`
- Handles placeholder replacement (`{{PROJECT_NAME}}` → `ai-mod`)
- Optimized for monorepo directory structure
- Faster path resolution

**For two-repo projects (pm-app, etc.):** Use `./scripts/sync-fix-to-project.sh`
- Handles two-repo pattern (separate infra/stack repos)
- Searches across multiple directories

**Why not manual `cp`?**
- ❌ Doesn't replace placeholders
- ❌ Causes build errors: `Cannot find module '@{{PROJECT_NAME}}/...'`
- ❌ Requires manual path calculation
