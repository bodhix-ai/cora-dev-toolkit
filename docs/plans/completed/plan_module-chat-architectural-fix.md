# Plan: Fix Module-Chat Architectural Dependencies

**Status**: ❌ CANCELLED / SUPERSEDED  
**Superseded By**: `plan_module-chat-mui-migration.md`  
**Reason**: This plan proposed creating a shared UI package with Shadcn UI, which violated CORA's Material-UI standard (Rule 4.2). The correct fix was to migrate module-chat to Material-UI, which was completed in `plan_module-chat-mui-migration.md`.  
**Created**: January 16, 2026  
**Cancelled**: January 17, 2026  
**Priority**: HIGH  
**Estimated Duration**: 4-6 hours  
**Blocking**: Module-chat type-check failures  

---

## Problem Statement

Module-chat violates CORA module isolation principles by importing from app-level paths (`@/*`), making it:
- ❌ Unable to type-check independently
- ❌ Tightly coupled to the main app
- ❌ Not portable or reusable
- ❌ Inconsistent with module-kb pattern

**Root Cause**: Module-chat imports from `@/components/ui/*`, `@/lib/*`, etc., which are app-level paths that don't exist in module scope.

**Discovery**: January 16, 2026 during test-ws-25 TypeScript debugging

---

## Current State Analysis

### Module-Chat Dependencies (Problematic)

**App-level imports (❌):**
- `@/components/ui/button` - Shadcn UI components
- `@/components/ui/textarea` - Shadcn UI components
- `@/components/ui/badge` - Shadcn UI components
- `@/components/ui/dialog` - Shadcn UI components
- `@/components/ui/dropdown-menu` - Shadcn UI components
- `@/components/ui/input` - Shadcn UI components
- `@/components/ui/label` - Shadcn UI components
- `@/components/ui/select` - Shadcn UI components
- `@/components/ui/scroll-area` - Shadcn UI components
- `@/components/ui/alert` - Shadcn UI components
- `@/components/ui/checkbox` - Shadcn UI components
- `@/components/ui/collapsible` - Shadcn UI components
- `@/components/ui/separator` - Shadcn UI components
- `@/components/ui/alert-dialog` - Shadcn UI components
- `@/lib/utils` - Utility functions (cn, etc.)
- `@/store/chatStore` - Chat state management
- `@/lib/hooks/useAuth` - Auth hooks
- `@/lib/auth-utils` - Auth utilities
- `@/store/sidebarStore` - Sidebar state

**External imports (✅):**
- `lucide-react` - Icon library
- `next-auth/react` - Authentication
- `zustand` - State management

**Affected files:** ~15 components, 8 hooks, 2 pages, 1 store

### Module-KB Pattern (Correct)

**External imports only (✅):**
- `@mui/material` - UI components
- `@mui/icons-material` - Icons
- Local module imports only (`../types`, `./hooks`)

**Result:** Module-KB can type-check independently and has no app-level dependencies.

---

## Solution Options

### Option A: Extract Shared UI Package (Recommended)

**Approach:** Create `@{{PROJECT_NAME}}/ui` workspace package for shared UI components

**Pros:**
- ✅ Maintains existing component design (Shadcn UI)
- ✅ Allows app and modules to share UI components
- ✅ Proper architectural pattern for CORA
- ✅ Future modules can also use shared UI
- ✅ Minimal component rewrites needed

**Cons:**
- ⚠️ Requires creating new workspace package
- ⚠️ Need to migrate components from app to package
- ⚠️ More infrastructure to maintain

**Time Estimate:** 4-6 hours

---

### Option B: Switch to External UI Library

**Approach:** Rewrite module-chat to use `@mui/material` (like module-kb)

**Pros:**
- ✅ Modules are truly self-contained
- ✅ Follows module-kb's proven pattern
- ✅ No shared workspace package needed
- ✅ Well-documented external library

**Cons:**
- ⚠️ Requires rewriting all components
- ⚠️ Different UI design language from app
- ⚠️ More work upfront
- ⚠️ Two UI libraries in project (Shadcn + MUI)

**Time Estimate:** 6-8 hours

---

## Recommended Solution: Option A (Extract Shared UI Package)

Create `@{{PROJECT_NAME}}/ui` workspace package containing Shadcn UI components.

---

## Implementation Plan

### Phase 1: Create UI Workspace Package (1 hour)

**Goal:** Set up `@{{PROJECT_NAME}}/ui` workspace package infrastructure

#### Step 1.1: Create Package Structure

```bash
# In templates/_project-stack-template/
mkdir -p packages/ui/components
mkdir -p packages/ui/lib
mkdir -p packages/ui/types
```

#### Step 1.2: Create package.json

```json
{
  "name": "@{{PROJECT_NAME}}/ui",
  "version": "1.0.0",
  "private": true,
  "description": "Shared UI components for {{PROJECT_NAME}}",
  "main": "index.ts",
  "types": "index.ts",
  "scripts": {
    "build": "tsc -b",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "@radix-ui/react-slot": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-label": "^2.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.0",
    "@radix-ui/react-alert-dialog": "^1.0.0",
    "@radix-ui/react-checkbox": "^1.0.0",
    "@radix-ui/react-collapsible": "^1.0.0",
    "@radix-ui/react-scroll-area": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0"
  },
  "peerDependencies": {
    "react": "^18.2.0"
  }
}
```

#### Step 1.3: Create tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

#### Step 1.4: Create index.ts

```typescript
// Export all UI components
export * from './components/button';
export * from './components/textarea';
export * from './components/badge';
export * from './components/dialog';
export * from './components/dropdown-menu';
export * from './components/input';
export * from './components/label';
export * from './components/select';
export * from './components/scroll-area';
export * from './components/alert';
export * from './components/checkbox';
export * from './components/collapsible';
export * from './components/separator';
export * from './components/alert-dialog';

// Export utilities
export * from './lib/utils';
```

---

### Phase 2: Migrate UI Components (2 hours)

**Goal:** Copy Shadcn UI components from app to UI package

#### Step 2.1: Copy Components from App

```bash
# Copy Shadcn UI components
cp apps/web/components/ui/button.tsx packages/ui/components/
cp apps/web/components/ui/textarea.tsx packages/ui/components/
cp apps/web/components/ui/badge.tsx packages/ui/components/
cp apps/web/components/ui/dialog.tsx packages/ui/components/
cp apps/web/components/ui/dropdown-menu.tsx packages/ui/components/
cp apps/web/components/ui/input.tsx packages/ui/components/
cp apps/web/components/ui/label.tsx packages/ui/components/
cp apps/web/components/ui/select.tsx packages/ui/components/
cp apps/web/components/ui/scroll-area.tsx packages/ui/components/
cp apps/web/components/ui/alert.tsx packages/ui/components/
cp apps/web/components/ui/checkbox.tsx packages/ui/components/
cp apps/web/components/ui/collapsible.tsx packages/ui/components/
cp apps/web/components/ui/separator.tsx packages/ui/components/
cp apps/web/components/ui/alert-dialog.tsx packages/ui/components/

# Copy utilities
cp apps/web/lib/utils.ts packages/ui/lib/
```

#### Step 2.2: Update Component Imports

In each copied component, update internal imports:

```typescript
// Before
import { cn } from "@/lib/utils"

// After
import { cn } from "../lib/utils"
```

#### Step 2.3: Update root tsconfig.json Path Aliases

```json
{
  "paths": {
    "@{{PROJECT_NAME}}/ui": ["packages/ui"],
    "@{{PROJECT_NAME}}/ui/*": ["packages/ui/*"],
    // ... other paths
  }
}
```

---

### Phase 3: Update Module-Chat to Use UI Package (1.5 hours)

**Goal:** Replace all `@/*` imports with `@{{PROJECT_NAME}}/ui` imports

#### Step 3.1: Update Module-Chat package.json

```json
{
  "dependencies": {
    "@{{PROJECT_NAME}}/ui": "workspace:*",
    // ... other dependencies
  }
}
```

#### Step 3.2: Update All Component Imports

**Before:**
```typescript
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
```

**After:**
```typescript
import { Button, Textarea } from '@{{PROJECT_NAME}}/ui';
import { cn } from '@{{PROJECT_NAME}}/ui';
```

**Files to update:** ~15 components, 8 hooks, 2 pages

#### Step 3.3: Update chatStore.ts

**Issue:** Store currently in module - should it be in app?

**Option 1:** Keep in module, export for app to use
**Option 2:** Move to app, have module import from workspace package

**Recommendation:** Keep in module, export via module's index.ts

---

### Phase 4: Update Main App to Use UI Package (1 hour)

**Goal:** Migrate app to also use `@{{PROJECT_NAME}}/ui`

#### Step 4.1: Update App Imports

Replace all `@/components/ui/*` imports with `@{{PROJECT_NAME}}/ui` imports in:
- `apps/web/app/**/*`
- `apps/web/components/**/*`
- Other modules that may use UI components

#### Step 4.2: Update App's tsconfig.json

Ensure path alias is configured:

```json
{
  "paths": {
    "@/": ["./"],
    "@{{PROJECT_NAME}}/ui": ["../../packages/ui"],
    // ... other paths
  }
}
```

#### Step 4.3: Clean Up Old UI Directory (Optional)

Once all imports are migrated:

```bash
# Verify no references remain
grep -r "@/components/ui" apps/web/

# If clear, can remove (or keep as deprecated)
# rm -rf apps/web/components/ui/
```

---

### Phase 5: Validation and Testing (30 min)

**Goal:** Ensure everything works correctly

#### Step 5.1: Type-Check All Packages

```bash
# Check UI package
pnpm --filter @{{PROJECT_NAME}}/ui type-check

# Check module-chat
pnpm --filter @{{PROJECT_NAME}}/module-chat type-check

# Check main app
pnpm --filter {{PROJECT_NAME}}-web type-check

# Check all
pnpm type-check
```

#### Step 5.2: Build All Packages

```bash
# Build UI package
pnpm --filter @{{PROJECT_NAME}}/ui build

# Build module-chat
pnpm --filter @{{PROJECT_NAME}}/module-chat build

# Build all
pnpm build
```

#### Step 5.3: Run Dev Server

```bash
cd scripts
bash start-dev.sh
# Should start without type errors
```

#### Step 5.4: Manual Testing

- [ ] Chat interface loads correctly
- [ ] All UI components render properly
- [ ] Interactions work (buttons, dialogs, etc.)
- [ ] No console errors
- [ ] Chat functionality works end-to-end

---

### Phase 6: Update Templates and Documentation (1 hour)

**Goal:** Ensure all templates and docs reflect the new architecture

#### Step 6.1: Update Template READMEs

Add to `templates/_project-stack-template/README.md`:

```markdown
## Workspace Packages

- `@{{PROJECT_NAME}}/ui` - Shared UI components (Shadcn UI)
- `@{{PROJECT_NAME}}/api-client` - API client library
- `@{{PROJECT_NAME}}/shared-types` - Shared TypeScript types
- `@{{PROJECT_NAME}}/contracts` - API contracts
```

#### Step 6.2: Create Standard Document

Create `docs/standards/standard_MODULE-DEPENDENCIES.md`:

```markdown
# Standard: Module Dependencies

## Rule: Modules Must Be Self-Contained

Modules MAY depend on:
✅ External npm packages (React, @mui/material, etc.)
✅ Workspace packages (@{{PROJECT_NAME}}/ui, @{{PROJECT_NAME}}/api-client, etc.)
✅ Other modules (@{{PROJECT_NAME}}/module-access)
✅ Local files within the module (./types, ./hooks, etc.)

Modules MUST NOT depend on:
❌ App-level paths (@/*)
❌ Apps directory (apps/web/*)
❌ Non-workspace packages

## Examples

### ✅ Correct
```typescript
import { Button } from '@{{PROJECT_NAME}}/ui';
import type { User } from '@{{PROJECT_NAME}}/shared-types';
```

### ❌ Incorrect
```typescript
import { Button } from '@/components/ui/button';
import type { User } from '@/types';
```
```

#### Step 6.3: Update Module Template Checklist

Add to `templates/MODULE-SPEC-TEMPLATE.md`:

```markdown
## Pre-Submission Checklist

- [ ] Module has tsconfig.json
- [ ] Module has package.json
- [ ] No imports from @/* paths (use @{{PROJECT_NAME}}/ui instead)
- [ ] Uses workspace packages for shared code
- [ ] Type-check passes independently
- [ ] Uses {{PROJECT_NAME}} placeholders
```

#### Step 6.4: Create Validation Script

Create `scripts/validate-module-dependencies.sh`:

```bash
#!/bin/bash
set -e

echo "Validating module dependencies..."

ERRORS=0

for module in templates/_modules-core/*/frontend; do
  if [ ! -d "$module" ]; then
    continue
  fi
  
  # Check for app-level imports
  if grep -r "from '@/" "$module" 2>/dev/null | grep -v node_modules; then
    echo "❌ ERROR: $module has app-level imports (@/*)"
    echo "   Use @{{PROJECT_NAME}}/ui or external packages instead"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "❌ Validation failed: $ERRORS module(s) with violations"
  exit 1
fi

echo "✅ All modules follow dependency standards"
```

#### Step 6.5: Update .clinerules

Add to `.clinerules`:

```markdown
## Module Dependency Rules

**CRITICAL:** Modules MUST NOT import from app-level paths (`@/*`).

**Correct:**
```typescript
import { Button } from '@{{PROJECT_NAME}}/ui';  // ✅ Workspace package
import { User } from '@{{PROJECT_NAME}}/shared-types';  // ✅ Workspace package
```

**Incorrect:**
```typescript
import { Button } from '@/components/ui/button';  // ❌ App-level path
```

**Why:** App-level imports break module isolation and prevent independent type-checking.

**See:** `docs/standards/standard_MODULE-DEPENDENCIES.md`
```

---

## Success Criteria

### Technical Validation

- [ ] `@{{PROJECT_NAME}}/ui` package exists and builds
- [ ] Module-chat has NO `@/*` imports
- [ ] Module-chat type-check passes independently
- [ ] Main app type-check passes
- [ ] Dev server starts without errors
- [ ] All UI components render correctly
- [ ] Chat functionality works end-to-end

### Documentation

- [ ] Module dependency standard created
- [ ] Validation script created and passing
- [ ] Template checklist updated
- [ ] .clinerules updated
- [ ] README updated with new package

### Future Prevention

- [ ] Validation script added to pre-commit hook
- [ ] Template review process includes dependency check
- [ ] All developers aware of new standard

---

## Rollback Plan

If issues arise during implementation:

### Immediate Rollback

1. Revert module-chat to use `--skip-type-check` flag
2. Document issues encountered
3. Keep UI package but don't require its use yet

### Partial Rollback

1. Complete UI package extraction
2. Update only new modules to use it
3. Leave module-chat as-is (with skip-type-check)
4. Migrate module-chat in future sprint

### Full Rollback

1. Delete `packages/ui/` directory
2. Revert all import changes
3. Keep validation script and documentation for future

---

## Risks and Mitigations

### Risk 1: Breaking Changes During Migration

**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**
- Create feature branch for this work
- Test thoroughly before merging
- Have rollback plan ready
- Start with test environment (test-ws-26)

### Risk 2: Component Styling Issues

**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:**
- Copy components exactly as-is
- Test all components visually
- Check Tailwind config is available to UI package

### Risk 3: Build/Bundle Size Increase

**Likelihood:** Low  
**Impact:** Low  
**Mitigation:**
- UI package is already in use (just extracted)
- Tree-shaking should eliminate unused components
- Monitor bundle size before/after

---

## Implementation Order

1. **Phase 1:** Create UI workspace package infrastructure
2. **Phase 2:** Migrate UI components from app to package
3. **Phase 3:** Update module-chat to use UI package
4. **Phase 4:** Update main app to use UI package
5. **Phase 5:** Validation and testing
6. **Phase 6:** Documentation and standards

**Total Estimated Time:** 4-6 hours

---

## Notes

- This fix applies to **templates**, not just test projects
- All changes should be made to `templates/_project-stack-template/` first
- Test in test-ws-26 before considering complete
- This becomes the standard pattern for all future modules
- Module-KB already follows correct pattern (uses @mui/material)

---

## Related Documents

- `docs/standards/standard_MODULE-DEPENDENCIES.md` (to be created)
- `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`
- `templates/MODULE-SPEC-TEMPLATE.md`
- `.clinerules`

---

**Created:** January 16, 2026  
**Status:** Ready for Implementation  
**Next Action:** Begin Phase 1 in next task session
