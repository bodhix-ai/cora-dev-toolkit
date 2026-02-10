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

### 2. Copy Fixed File to Test Project

Use direct `cp` command (more reliable than sync script for monorepo):

```bash
# Determine source template file and target in test project
TEMPLATE_FILE="<path-in-templates>"
TEST_PROJECT="/Users/aaron/code/bodhix/testing/mono-s1/ai-mod-stack"

# For module files:
# Copy from: templates/_modules-core/<module>/frontend/index.ts
# Copy to:   $TEST_PROJECT/packages/<module>/frontend/index.ts

# For web app files:
# Copy from: templates/_project-monorepo-template/apps/web/<path>
# Copy to:   $TEST_PROJECT/apps/web/<path>

cp "$TEMPLATE_FILE" "$TEST_PROJECT/<target-path>"
```

**Example commands:**

```bash
TEST_PROJECT="/Users/aaron/code/bodhix/testing/mono-s1/ai-mod-stack"

# Module frontend file
cp templates/_modules-core/module-ws/frontend/index.ts \
   $TEST_PROJECT/packages/module-ws/frontend/index.ts

# Web app tsconfig
cp templates/_project-monorepo-template/apps/web/tsconfig.json \
   $TEST_PROJECT/apps/web/tsconfig.json

# Admin page
cp templates/_project-monorepo-template/apps/web/app/admin/org/access/page.tsx \
   $TEST_PROJECT/apps/web/app/admin/org/access/page.tsx
```

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
2. **Direct Copy**: Use `cp` command - more reliable than sync script for monorepo
3. **Rebuild**: Always rebuild affected modules after changes
4. **Test**: Verify the fix works in the test project

## Common File Types

| File Type | Template Location | Test Project Location |
|-----------|------------------|----------------------|
| Module frontend | `templates/_modules-core/<module>/frontend/` | `$TEST_PROJECT/packages/<module>/frontend/` |
| Web app page | `templates/_project-monorepo-template/apps/web/` | `$TEST_PROJECT/apps/web/` |
| Module Lambda | `templates/_modules-core/<module>/backend/` | `$TEST_PROJECT/packages/<module>/backend/` |
| Infrastructure | `templates/_project-monorepo-template/envs/` | `$TEST_PROJECT/envs/` |

## Why Not Use sync-fix-to-project.sh?

The sync script has issues with monorepo projects:
- Can hang/timeout when searching large directory structures
- Placeholder replacement can fail silently
- Direct `cp` is faster and more predictable for monorepo

For **two-repo projects** (pm-app, etc.), continue using the sync script as normal.