# TypeScript Project References for CORA Monorepo

**Status:** 📋 PLANNED (Future Sprint)  
**Priority:** Medium  
**Created:** February 8, 2026  
**Origin:** S8 cross-package type-check failure investigation  
**Estimated Effort:** 2-3 hours  

---

## 📊 Problem Statement

CORA's pnpm workspace monorepo has a **compilation boundary violation** that causes cross-package type-check failures.

### Current Behavior

When running `pnpm -r run type-check`, modules like `module-mgmt` and `module-voice` fail with errors like:

```
../../module-access/frontend/components/admin/OrgAccessAdmin.tsx(5,58): 
error TS2307: Cannot find module '@ai-mod/module-access' or its corresponding type declarations.
```

### Root Cause

1. Each module's `tsconfig.json` uses `"include": ["**/*.ts", "**/*.tsx"]` with no project references
2. Module `package.json` files point to raw TypeScript source: `"main": "./index.ts"`, `"types": "./index.ts"`
3. When module-mgmt type-checks, tsc follows pnpm symlinks → finds module-access **raw source** → tries to compile it in module-mgmt's compilation context
4. Self-referencing imports (e.g., `@ai-mod/module-access` inside module-access) can't resolve in another package's compilation context

### Impact

- `pnpm -r run type-check` fails for modules that depend on module-access
- Dev server (`next dev`) works fine because Next.js uses a different resolution strategy
- The error is cosmetic for development but blocks CI/CD type-check gates

---

## 🎯 Solution: TypeScript Project References

### What Are Project References?

[TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html) allow structuring a TypeScript monorepo so each package:

- Compiles in **isolation** with its own `tsconfig.json`
- Produces **declaration files** (`.d.ts`) that other packages consume
- Has proper **compilation boundaries** — tsc never follows symlinks into raw source

This is the industry standard pattern used by:
- **Nx** monorepos
- **Turborepo** projects
- **Rush** monorepos
- **Lerna** with TypeScript

### Architecture

```
packages/
├── shared/
│   └── tsconfig.json          # composite: true
├── module-access/
│   └── frontend/
│       └── tsconfig.json      # composite: true, references: [shared]
├── module-mgmt/
│   └── frontend/
│       └── tsconfig.json      # composite: true, references: [module-access, shared]
├── module-voice/
│   └── frontend/
│       └── tsconfig.json      # composite: true, references: [module-access, shared]
└── tsconfig.json              # Root: references all packages
```

---

## 📝 Implementation Plan

### Phase 1: Root tsconfig.json Setup

Create a root `tsconfig.json` with project references:

```json
{
  "files": [],
  "references": [
    { "path": "packages/shared" },
    { "path": "packages/module-access/frontend" },
    { "path": "packages/module-ai/frontend" },
    { "path": "packages/module-ws/frontend" },
    { "path": "packages/module-mgmt/frontend" },
    { "path": "packages/module-kb/frontend" },
    { "path": "packages/module-chat/frontend" },
    { "path": "packages/module-eval/frontend" },
    { "path": "packages/module-voice/frontend" },
    { "path": "packages/module-eval-studio/frontend" }
  ]
}
```

### Phase 2: Update Each Module's tsconfig.json

Each module's `tsconfig.json` needs:

```json
{
  "compilerOptions": {
    "composite": true,           // ← REQUIRED for project references
    "declaration": true,         // ← Already present
    "declarationMap": true,      // ← Already present
    "outDir": "./dist",
    "rootDir": "./"
    // ... existing options
  },
  "references": [
    { "path": "../../shared" },
    { "path": "../../module-access/frontend" }  // ← Only if this module imports from module-access
  ],
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

### Phase 3: Update package.json Exports

Each module's `package.json` should point to compiled output for type resolution:

**Before:**
```json
{
  "main": "./index.ts",
  "types": "./index.ts"
}
```

**After:**
```json
{
  "main": "./index.ts",
  "types": "./dist/index.d.ts",
  "typesVersions": {
    "*": {
      "admin": ["./dist/components/admin/index.d.ts"]
    }
  }
}
```

### Phase 4: Update Build Scripts

Update `pnpm -r run type-check` to use `tsc --build` instead of `tsc --noEmit`:

```json
{
  "scripts": {
    "type-check": "tsc --build",
    "type-check:clean": "tsc --build --clean"
  }
}
```

Or use the root-level build:
```bash
# From monorepo root
tsc --build --force
```

### Phase 5: Update Templates

Apply the same changes to:
- `templates/_modules-core/*/frontend/tsconfig.json`
- `templates/_modules-functional/*/frontend/tsconfig.json`
- `templates/_project-stack-template/tsconfig.json`

### Phase 6: Verify

- [ ] `pnpm -r run type-check` passes for all packages
- [ ] `tsc --build` from root compiles all packages in dependency order
- [ ] Dev server still works normally
- [ ] No regression in Next.js compilation
- [ ] CI/CD pipeline passes

---

## 📋 Module Dependency Graph

For setting up `references` correctly:

```
shared (no dependencies)
  ↑
module-access (depends on: shared)
  ↑
module-ai (depends on: shared, module-access)
module-ws (depends on: shared, module-access)
  ↑
module-mgmt (depends on: shared, module-access, module-ws)
module-kb (depends on: shared, module-access, module-ws, module-ai)
module-chat (depends on: shared, module-access, module-ws, module-ai)
  ↑
module-eval (depends on: shared, module-access, module-ws, module-ai)
module-voice (depends on: shared, module-access, module-ws, module-ai)
module-eval-studio (depends on: shared, module-access, module-ws, module-ai, module-eval)
```

---

## ⚠️ Considerations

### Dev Experience Impact
- First `tsc --build` takes longer (builds all packages)
- Incremental builds are faster (only rebuilds changed packages)
- `next dev` is unaffected (uses its own compilation)

### Migration Risk
- Low risk — changes are additive (adding `composite`, `references`)
- Existing `tsc --noEmit` still works per-package
- Can be rolled out one package at a time

### Alternative: `skipLibCheck` Workaround
If project references prove too complex, a simpler workaround is to add self-referencing path mappings:
```json
{
  "compilerOptions": {
    "paths": {
      "@{{PROJECT_NAME}}/module-access": ["../../module-access/frontend/index.ts"]
    }
  }
}
```
This is less clean but solves the immediate error with minimal changes.

---

## 🔗 References

- [TypeScript Handbook: Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TypeScript 3.0 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#project-references)
- [Turborepo TypeScript Guide](https://turbo.build/repo/docs/handbook/linting/typescript)
- [Nx TypeScript Plugin](https://nx.dev/packages/js/generators/library)

---