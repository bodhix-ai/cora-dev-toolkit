# ADR-023: CORA Monorepo Build Standards

**Status:** ✅ Accepted  
**Date:** February 10, 2026  
**Supersedes:** N/A (New pattern)  
**Related:** ADR-022 (Monorepo Pattern - Coming)

---

## Context

During implementation of the CORA monorepo template (`_project-monorepo-template`), we encountered multiple build-time and type resolution issues unique to pnpm workspace monorepos with Next.js. This ADR documents the discovered patterns, requirements, and standards necessary for successful builds.

**Problem Space:**
- Next.js + pnpm workspaces + TypeScript have specific configuration requirements
- Docker multi-stage builds for monorepos require careful filter syntax and memory management
- Type extensions (like NextAuth) don't automatically propagate across workspace packages
- Module dependencies must be explicitly declared even within the same monorepo

**Discovery Process:**
These standards were discovered through iterative debugging during Phase 2B (Build Readiness), where we fixed 10 critical issues to achieve successful web app and Docker builds.

---

## Decision

We establish the following standards for CORA monorepo projects:

### 1. Placeholder Standards

#### 1.1 Display Name Placeholder

**Standard:** All user-facing text must use `{{PROJECT_DISPLAY_NAME}}` placeholder.

**Rationale:** Project display names may differ from machine-readable names (e.g., "AI Security Platform" vs "ai-sec").

**Implementation:**
```typescript
// ✅ CORRECT
<h1>Welcome to {{PROJECT_DISPLAY_NAME}}</h1>

// ❌ WRONG
<h1>Welcome to {{PROJECT_NAME}}</h1>
```

**Script Support:**
- `create-cora-monorepo.sh` reads `project.display_name` from config
- `sync-fix-to-project.sh` replaces placeholder when syncing templates

---

### 2. Shared Package Export Standards

#### 2.1 Type-Only Exports

**Standard:** Shared packages must export all types/interfaces used by consuming packages.

**Rationale:** TypeScript workspace compilation requires explicit type exports to avoid "Cannot find name" errors.

**Implementation:**
```typescript
// packages/shared/workspace-plugin/index.ts
// ✅ CORRECT - Export all used types
export type { ModuleConfig, WorkspacePlugin, PluginContext } from './types';
export { createPlugin } from './factory';

// ❌ WRONG - Missing ModuleConfig export
export type { WorkspacePlugin, PluginContext } from './types';
export { createPlugin } from './factory';
```

**Affected Files:**
- `templates/_project-monorepo-template/packages/shared/workspace-plugin/index.ts`

---

### 3. React Component Type Inference Standards

#### 3.1 Let TypeScript Infer Generic Types

**Standard:** When using generic React components with type parameters, prefer type inference over explicit annotations when the types can be inferred from usage.

**Rationale:** Explicit type annotations can conflict with TypeScript's inference, causing "Type 'X' is not assignable to type 'Y'" errors.

**Implementation:**
```typescript
// ✅ CORRECT - Let TypeScript infer types
const PluginComponent = plugin.component;
if (!PluginComponent) return null;
return <PluginComponent />;

// ❌ WRONG - Explicit type annotation conflicts with inference
const PluginComponent: React.ComponentType = plugin.component;
if (!PluginComponent) return null;
return <PluginComponent />;
```

**Affected Files:**
- `templates/_project-monorepo-template/apps/web/components/WorkspacePluginProvider.tsx`

---

### 4. Workspace Dependency Declaration Standards

#### 4.1 Explicit Shared Package Dependencies

**Standard:** All workspace packages that import from `@{PROJECT}/shared` must declare it as a dependency.

**Rationale:** pnpm workspaces require explicit dependency declarations even for packages in the same monorepo. Missing declarations cause "Cannot find module" errors during build.

**Implementation:**
```json
// packages/module-kb/frontend/package.json
// ✅ CORRECT - Explicit shared dependency
{
  "name": "@{{PROJECT_NAME}}/module-kb",
  "dependencies": {
    "@{{PROJECT_NAME}}/shared": "workspace:*",
    "@{{PROJECT_NAME}}/shared-types": "workspace:*"
  }
}

// ❌ WRONG - Missing shared dependency
{
  "name": "@{{PROJECT_NAME}}/module-kb",
  "dependencies": {
    "@{{PROJECT_NAME}}/shared-types": "workspace:*"
  }
}
```

**Affected Modules:**
- module-chat
- module-eval
- module-kb
- module-ws
- module-voice

**Rule:** If a module imports from `@{PROJECT}/shared`, it must list it in `dependencies`.

---

### 5. TypeScript Type Extension Resolution Standards

#### 5.1 Workspace Package Type Definitions in Next.js

**Standard:** Next.js app `tsconfig.json` must explicitly include type definition files from all workspace packages.

**Rationale:** TypeScript module augmentation (like NextAuth type extensions) only applies within the package where it's defined. Next.js builds that import from workspace packages don't automatically pick up those packages' type extensions.

**Implementation:**
```json
// apps/web/tsconfig.json
// ✅ CORRECT - Include workspace package types
{
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "types/**/*.ts",
    "../../packages/*/frontend/types/**/*.ts"  // ADD THIS
  ]
}

// ❌ WRONG - Only includes own types
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

**Pattern Explanation:**
- `../../packages/*/frontend/types/**/*.ts` - Glob pattern matching all workspace package type definitions
- This allows Next.js to see NextAuth session extensions defined in module packages
- Without this, errors like "Property 'accessToken' does not exist on type 'Session'" occur

**Affected Files:**
- `templates/_project-monorepo-template/apps/web/tsconfig.json`

---

### 6. Docker Build Standards

#### 6.1 pnpm Filter Syntax

**Standard:** Docker build commands must use project-specific package names in pnpm filters.

**Rationale:** pnpm workspace filters match package names (from `package.json`), not directory names. Generic filters like `--filter=web` fail.

**Implementation:**
```dockerfile
# ✅ CORRECT - Use project-specific package name
RUN pnpm install --frozen-lockfile --filter={{PROJECT_NAME}}-web...
RUN pnpm --filter={{PROJECT_NAME}}-web build

# ❌ WRONG - Generic name doesn't match package.json
RUN pnpm install --frozen-lockfile --filter=web...
RUN pnpm --filter=web build
```

**Why This Matters:**
- Package name in `apps/web/package.json`: `"name": "ai-mod-web"`
- Filter must match package name exactly: `--filter=ai-mod-web`
- Template placeholder `{{PROJECT_NAME}}` is replaced during project creation

**Affected Files:**
- `templates/_project-monorepo-template/Dockerfile`

---

#### 6.2 Node.js Memory Limits

**Standard:** Docker builds must allocate at least 4GB heap space for Next.js compilation.

**Rationale:** Large Next.js monorepo builds with multiple workspace dependencies exhaust the default Node.js heap size (1.4GB), causing "JavaScript heap out of memory" errors.

**Implementation:**
```dockerfile
# Stage 2: Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"  # ✅ ADD THIS - 4GB heap
RUN pnpm --filter={{PROJECT_NAME}}-web build
```

**Memory Allocation Guidelines:**
- **Minimum:** 4GB (`--max-old-space-size=4096`)
- **Recommended:** 4-6GB for production builds
- **Symptoms of insufficient memory:** "Reached heap limit Allocation failed - JavaScript heap out of memory"

**Affected Files:**
- `templates/_project-monorepo-template/Dockerfile`

---

#### 6.3 Public Directory Requirement

**Standard:** Next.js apps must have a `public/` directory, even if empty.

**Rationale:** Docker COPY command fails if source path doesn't exist. Next.js standalone builds expect `public/` directory to exist.

**Implementation:**
```bash
# Project structure - public directory must exist
apps/
  web/
    public/          # ✅ MUST EXIST
      .gitkeep       # Keep directory in git even if empty
    app/
    package.json
```

```dockerfile
# Dockerfile - Copies public directory (fails if missing)
COPY --from=builder /app/apps/web/public ./apps/web/public
```

**Setup:**
```bash
mkdir -p templates/_project-monorepo-template/apps/web/public
touch templates/_project-monorepo-template/apps/web/public/.gitkeep
```

**Affected Files:**
- `templates/_project-monorepo-template/apps/web/public/.gitkeep` (NEW)
- `templates/_project-monorepo-template/Dockerfile`

---

#### 6.4 ENV Syntax Standards

**Standard:** Use `ENV KEY=value` syntax (not legacy `ENV KEY value`).

**Rationale:** Legacy syntax generates Docker warnings and is deprecated.

**Implementation:**
```dockerfile
# ✅ CORRECT - Modern syntax
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

# ❌ WRONG - Legacy syntax (deprecated)
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_OPTIONS "--max-old-space-size=4096"
```

---

### 7. Next.js Configuration Standards

#### 7.1 Standalone Output Mode

**Standard:** Next.js apps for Docker deployment must use `output: 'standalone'`.

**Rationale:** Standalone mode generates a self-contained production build optimized for containerization.

**Implementation:**
```javascript
// apps/web/next.config.mjs
const nextConfig = {
  output: 'standalone',  // ✅ REQUIRED for Docker
  transpilePackages: [
    "@{{PROJECT_NAME}}/api-client",
    "@{{PROJECT_NAME}}/module-access",
    // ... other workspace packages
  ],
  reactStrictMode: true,
};
export default nextConfig;
```

**Affected Files:**
- `templates/_project-monorepo-template/apps/web/next.config.mjs`

---

#### 7.2 Workspace Package Transpilation

**Standard:** All imported workspace packages must be listed in `transpilePackages`.

**Rationale:** Next.js doesn't automatically transpile workspace packages. Without explicit configuration, imports from `@{PROJECT}/module-*` packages fail.

**Implementation:**
```javascript
// ✅ CORRECT - List all workspace packages
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

## Consequences

### Positive

1. **Reproducible Builds:** Following these standards ensures consistent builds across environments
2. **Clear Error Messages:** Violations of these standards produce specific, debuggable errors
3. **Future-Proof:** Standards based on official tool documentation and best practices
4. **Fast Iteration:** Template fixes propagate to new projects automatically

### Negative

1. **Additional Configuration:** More explicit configuration required compared to simple monorepos
2. **Learning Curve:** Developers must understand pnpm workspaces, Next.js, and Docker interactions
3. **Template Maintenance:** Standards must be maintained in templates and enforced during project creation

### Neutral

1. **Tool-Specific:** Standards assume pnpm + Next.js + Docker stack
2. **Version Dependencies:** Standards may need updates as tools evolve

---

## Validation

These standards were validated through:

1. **Iterative Testing:** Fixed 10 critical build issues during Phase 2B
2. **Clean Builds:** 
   - All 9 CORA modules build successfully
   - Web app builds successfully (29 pages generated)
   - Docker image builds successfully (260MB)
3. **Zero Errors:** Complete build with no TypeScript, ESLint, or runtime errors
4. **Real Project:** Tested with `ai-mod-stack` generated from template

---

## References

### Tool Documentation

- **pnpm Workspaces:** https://pnpm.io/workspaces
- **Next.js Standalone:** https://nextjs.org/docs/advanced-features/output-file-tracing
- **Next.js + Docker:** https://github.com/vercel/next.js/tree/canary/examples/with-docker
- **TypeScript Module Augmentation:** https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation

### CORA Templates

- **Monorepo Template:** `templates/_project-monorepo-template/`
- **Creation Script:** `scripts/create-cora-monorepo.sh`
- **Sync Script:** `scripts/sync-fix-to-project.sh`

### Related ADRs

- **ADR-022:** CORA Monorepo Pattern (Coming)
- **ADR-018:** API Route Structure
- **ADR-017:** Workspace Plugin Architecture

---

## Appendix A: Complete Fix List (Session 7)

During Phase 2B implementation, we fixed these issues by applying the standards in this ADR:

1. ✅ **{{PROJECT_DISPLAY_NAME}} Placeholder** - Scripts support display names
2. ✅ **Shared Package ModuleConfig Export** - Added missing type export
3. ✅ **WorkspacePluginProvider Type Errors** - Used TypeScript inference
4. ✅ **5 Modules Missing @{PROJECT}/shared** - Added explicit dependencies
5. ✅ **NextAuth Session Type Error** - Added workspace types to tsconfig include
6. ✅ **Docker Filter Placeholder** - Changed `web` to `{{PROJECT_NAME}}-web`
7. ✅ **Docker Memory Limit** - Added `NODE_OPTIONS` with 4GB heap
8. ✅ **Docker Public Directory** - Created empty public directory
9. ✅ **ENV Syntax** - Updated to modern `KEY=value` format
10. ✅ **Next.js Config** - Added all workspace packages to transpilePackages

**Result:** Clean builds across all targets (modules, web app, Docker image).

---

## Appendix B: Common Error Patterns

### Error: "Cannot find module '@{PROJECT}/shared'"

**Cause:** Missing workspace dependency in module package.json  
**Fix:** Add `"@{{PROJECT_NAME}}/shared": "workspace:*"` to dependencies  
**Standard:** Section 4.1

### Error: "Property 'accessToken' does not exist on type 'Session'"

**Cause:** Next.js tsconfig doesn't include workspace package types  
**Fix:** Add `"../../packages/*/frontend/types/**/*.ts"` to include array  
**Standard:** Section 5.1

### Error: "No projects matched the filters in '/app'"

**Cause:** Docker pnpm filter doesn't match package name  
**Fix:** Use `--filter={{PROJECT_NAME}}-web` not `--filter=web`  
**Standard:** Section 6.1

### Error: "JavaScript heap out of memory"

**Cause:** Insufficient Node.js heap size for Next.js build  
**Fix:** Add `ENV NODE_OPTIONS="--max-old-space-size=4096"` to Dockerfile  
**Standard:** Section 6.2

### Error: "'/app/apps/web/public': not found"

**Cause:** Missing public directory in source  
**Fix:** Create `apps/web/public/.gitkeep` in template  
**Standard:** Section 6.3

---

**Author:** AI Agent (Cline)  
**Reviewed By:** [Pending]  
**Approved By:** [Pending]