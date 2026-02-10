# 10_std_cora_MONOREPO: CORA Monorepo Standards

**Category:** CORA Architecture  
**Version:** 1.0  
**ADR:** [ADR-023](../arch%20decisions/ADR-023-MONOREPO-BUILD-STANDARDS.md)  
**Last Updated:** February 10, 2026

---

## Purpose

This standard defines requirements for CORA monorepo projects using pnpm workspaces, Next.js, and TypeScript. These standards ensure successful builds and proper type resolution across workspace packages.

**Applies to:** `_project-monorepo-template` and all projects generated from it.

---

## 1. Template Placeholder Standards

### 1.1 Display Name vs. Project Name

**Rule:** Use the correct placeholder for each context.

| Placeholder | Usage | Example |
|------------|-------|---------|
| `{{PROJECT_NAME}}` | Package names, code imports | `@ai-mod/module-eval` |
| `{{PROJECT_DISPLAY_NAME}}` | User-facing text, UI labels | "AI Security Platform" |

```typescript
// ✅ CORRECT
<h1>Welcome to {{PROJECT_DISPLAY_NAME}}</h1>
import { api } from "@{{PROJECT_NAME}}/api-client";

// ❌ WRONG
<h1>Welcome to {{PROJECT_NAME}}</h1>  // Too technical for users
import { api } from "@{{PROJECT_DISPLAY_NAME}}/api-client";  // Not a valid package name
```

---

## 2. Shared Package Export Standards

### 2.1 Complete Type Exports

**Rule:** Shared packages MUST export all types/interfaces used by consuming packages.

```typescript
// packages/shared/workspace-plugin/index.ts
// ✅ CORRECT - Export all used types
export type { ModuleConfig, WorkspacePlugin, PluginContext } from './types';
export { createPlugin } from './factory';

// ❌ WRONG - Missing ModuleConfig causes "Cannot find name 'ModuleConfig'" errors
export type { WorkspacePlugin, PluginContext } from './types';
export { createPlugin } from './factory';
```

**Validation:** TypeScript compilation will fail with "Cannot find name" errors if types are missing.

---

## 3. TypeScript Type Inference Standards

### 3.1 Generic Component Types

**Rule:** Prefer type inference over explicit type annotations for generic React components.

```typescript
// ✅ CORRECT - Let TypeScript infer the type
const PluginComponent = plugin.component;
if (!PluginComponent) return null;
return <PluginComponent />;

// ❌ WRONG - Explicit annotation conflicts with inference
const PluginComponent: React.ComponentType = plugin.component;
if (!PluginComponent) return null;
return <PluginComponent />;  // Type error!
```

**Rationale:** Generic types with constraints work better with inference than explicit annotations.

---

## 4. Workspace Dependency Declaration Standards

### 4.1 Explicit Dependencies Rule

**Rule:** All workspace packages MUST explicitly declare dependencies on other workspace packages they import from.

**Why:** pnpm workspaces require explicit declarations even within the same monorepo.

```json
// packages/module-kb/frontend/package.json
// ✅ CORRECT - Declares all imported workspace packages
{
  "name": "@{{PROJECT_NAME}}/module-kb",
  "dependencies": {
    "@{{PROJECT_NAME}}/shared": "workspace:*",
    "@{{PROJECT_NAME}}/shared-types": "workspace:*",
    "@{{PROJECT_NAME}}/api-client": "workspace:*"
  }
}

// ❌ WRONG - Missing @{PROJECT}/shared causes build errors
{
  "name": "@{{PROJECT_NAME}}/module-kb",
  "dependencies": {
    "@{{PROJECT_NAME}}/shared-types": "workspace:*",
    "@{{PROJECT_NAME}}/api-client": "workspace:*"
  }
}
```

**Error Pattern:** `Cannot find module '@{PROJECT}/shared'` during build.

**Quick Fix:**
```bash
# Add missing dependency
cd packages/module-{name}/frontend
# Add to package.json dependencies:
"@{{PROJECT_NAME}}/shared": "workspace:*"
```

---

## 5. TypeScript Type Extension Resolution

### 5.1 Workspace Package Types in Next.js

**Rule:** Next.js `tsconfig.json` MUST include type definitions from all workspace packages.

**Why:** Type extensions (like NextAuth) defined in workspace packages aren't automatically visible to Next.js.

```json
// apps/web/tsconfig.json
// ✅ CORRECT - Includes workspace package types
{
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "types/**/*.ts",
    "../../packages/*/frontend/types/**/*.ts"  // ✅ ADD THIS
  ]
}

// ❌ WRONG - Missing workspace types
{
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "types/**/*.ts"
  ]
}
```

**Error Pattern:** `Property 'accessToken' does not exist on type 'Session'` when workspace packages augment types.

**Pattern:** Use glob `../../packages/*/frontend/types/**/*.ts` to include all workspace package type definitions.

---

## 6. Next.js Workspace Configuration

### 6.1 Standalone Output Mode

**Rule:** Next.js apps for Docker deployment MUST use `output: 'standalone'`.

```javascript
// apps/web/next.config.mjs
// ✅ CORRECT
const nextConfig = {
  output: 'standalone',  // Required for Docker
  transpilePackages: [ /* workspace packages */ ],
};
```

### 6.2 Workspace Package Transpilation

**Rule:** ALL imported workspace packages MUST be listed in `transpilePackages`.

```javascript
// ✅ CORRECT - Complete list
transpilePackages: [
  "@{{PROJECT_NAME}}/api-client",
  "@{{PROJECT_NAME}}/shared-types",
  "@{{PROJECT_NAME}}/contracts",
  "@{{PROJECT_NAME}}/shared",
  "@{{PROJECT_NAME}}/module-access",
  "@{{PROJECT_NAME}}/module-ai",
  "@{{PROJECT_NAME}}/module-ws",
  "@{{PROJECT_NAME}}/module-mgmt",
  "@{{PROJECT_NAME}}/module-kb",
  "@{{PROJECT_NAME}}/module-chat",
  "@{{PROJECT_NAME}}/module-eval",
  "@{{PROJECT_NAME}}/module-voice",
  "@{{PROJECT_NAME}}/module-eval-studio",
]

// ❌ WRONG - Missing packages cause "Module parse failed" errors
transpilePackages: [
  "@{{PROJECT_NAME}}/api-client",
  "@{{PROJECT_NAME}}/module-access",
]
```

---

## Common Error Patterns

### Error: "Cannot find module '@{PROJECT}/shared'"
- **Cause:** Missing workspace dependency in module package.json
- **Fix:** Add `"@{{PROJECT_NAME}}/shared": "workspace:*"` to dependencies
- **Standard:** Section 4.1

### Error: "Property 'X' does not exist on type 'Y'"
- **Cause:** Type extensions not visible to Next.js
- **Fix:** Add `"../../packages/*/frontend/types/**/*.ts"` to tsconfig include
- **Standard:** Section 5.1

### Error: "Cannot find name 'ModuleConfig'"
- **Cause:** Missing type export in shared package
- **Fix:** Export type from shared package index
- **Standard:** Section 2.1

---

## Validation

**Build Checks:**
1. All 9 CORA modules build successfully: `pnpm -r build`
2. Web app builds successfully: `pnpm --filter=web build`
3. Zero TypeScript errors: `pnpm -r type-check`

**Template Files:**
- `templates/_project-monorepo-template/apps/web/tsconfig.json`
- `templates/_project-monorepo-template/apps/web/next.config.mjs`
- `templates/_project-monorepo-template/packages/shared/workspace-plugin/index.ts`
- Module `package.json` files in `templates/_modules-*/*/frontend/package.json`

---

**Related Standards:**
- [30_std_infra_DOCKER-BUILD](30_std_infra_DOCKER-BUILD.md) - Docker build configuration
- [00_index_STANDARDS](00_index_STANDARDS.md) - Standards index

**Related ADRs:**
- [ADR-023](../arch%20decisions/ADR-023-MONOREPO-BUILD-STANDARDS.md) - Complete monorepo build standards with rationale
- ADR-022 - CORA Monorepo Pattern (Coming)