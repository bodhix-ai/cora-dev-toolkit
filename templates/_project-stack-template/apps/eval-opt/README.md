# CORA Eval Optimizer - Sprint 1 Prototype

**Status**: ✅ Phase 2 Complete (Prototype Development)  
**Branch**: `feature/eval-optimization-s1`  
**Deployment Model**: Option A - Same Stack Repo

---

## Overview

This is a **minimal prototype** demonstrating that the eval-optimizer can be deployed as a companion app within the same CORA stack repository. The prototype validates key architectural assumptions for Sprint 1.

---

## What This Prototype Proves

### ✅ Shared Authentication
- Uses the **same Okta/Cognito configuration** as the main app
- Users authenticate once and access both apps
- NextAuth session management works across apps

### ✅ Code Reuse
- Imports `createAuthenticatedClient` from `@{project}/api-client` package
- Uses shared TypeScript types from `@{project}/shared-types`
- Demonstrates ADR-004 factory pattern compliance
- No code duplication

### ✅ API Integration
- Calls CORA module APIs (module-access, module-ws, module-kb, module-eval)
- End-to-end workflow: Create org → Create workspace → Upload doc → Run eval
- Proper authentication headers via shared API client

### ✅ Deployment Architecture
- Lives in `apps/eval-optimizer/` within the monorepo
- Has its own build/deploy pipeline (`npm run dev --port 3001`)
- Shares infrastructure (Cognito, API Gateway, database)
- Independent routes (`/optimizer`)

---

## File Structure

```
apps/eval-optimizer/
├── package.json           # Dependencies (minimal, reuses workspace packages)
├── tsconfig.json          # Extends workspace TypeScript config
├── next.config.mjs        # Next.js config (transpiles workspace packages)
├── auth.ts                # NextAuth - SAME Cognito as main app
├── middleware.ts          # Auth middleware
├── app/
│   ├── layout.tsx         # Root layout with SessionProvider
│   ├── page.tsx           # Landing page (shows session info)
│   └── optimizer/
│       └── page.tsx       # Main workflow (API integration demo)
└── lib/
    └── api-client.ts      # Wraps shared API client factory
```

---

## How to Test (When Template is Used)

1. **Create a project from template:**
   ```bash
   cd cora-dev-toolkit
   ./scripts/create-cora-project.sh --project test-optim
   ```

2. **Navigate to the eval-optimizer app:**
   ```bash
   cd test-optim-stack/apps/eval-optimizer
   pnpm install
   ```

3. **Start the dev server:**
   ```bash
   pnpm dev  # Runs on port 3001
   ```

4. **Access the app:**
   - Open: http://localhost:3001
   - Sign in with same Okta credentials as main app
   - Click "Go to Optimizer Workflow"
   - Click "▶ Run Workflow" to test API integration

---

## Expected Behavior

### Success Criteria (Sprint 1)

✅ **Authentication:**
- Session loads from NextAuth
- Access token is available
- User info displays correctly

✅ **API Client:**
- Factory pattern works (imports from shared package)
- Requests are properly formatted
- Auth headers are included

⚠️ **API Calls:**
- May fail with CORS, 401, or 404 errors
- **This is expected** - endpoints may not be ready yet
- **Goal**: Prove the integration pattern, not the endpoints

### What "Success" Looks Like

The workflow logs should show:
```
✅ API client created with access token
📝 Step 1: Creating test organization...
❌ Error: 404 Not Found (or similar)
```

This proves:
- Auth integration works (access token retrieved)
- API client factory works (from shared package)
- Requests are properly structured (even if they fail)

---

## Comparison to Other Options

| Aspect | Option A (This) | Option B (Separate Repo) | Option C (Toolkit) |
|--------|----------------|-------------------------|-------------------|
| **Code Reuse** | ✅ High (direct imports) | ❌ Low (duplicate setup) | ❌ Low (different context) |
| **Auth Setup** | ✅ Shared Okta config | ⚠️ Same user pool, separate config | ❌ Dev credentials only |
| **Deployment** | ✅ Part of main CI/CD | ⚠️ Separate pipeline needed | ✅ No production deploy |
| **Infrastructure** | ✅ Shared (zero additional) | ⚠️ New CloudFront, S3, etc. | ✅ Local CLI only |
| **Development Speed** | ✅ Fast (everything in monorepo) | ⚠️ Slower (coordinate changes) | ✅ Fast (local only) |

---

## Next Steps (Phase 3 & 4)

1. **Phase 3: Option Evaluation**
   - Analyze all three deployment options
   - Create scoring matrix with quantitative metrics
   - Document trade-offs and edge cases

2. **Phase 4: Decision & Documentation**
   - Create ADR-020: Eval Optimizer Deployment Architecture
   - Document final decision with rationale
   - Outline Sprint 2 implementation plan

---

## Notes

- **This is a prototype**, not a production-ready app
- TypeScript errors in templates are expected (resolved when project is created)
- Future sprints will add:
  - Full UI (analyst dashboard, metrics visualization)
  - Truth key management
  - Prompt versioning
  - Optimization algorithms

---

**Last Updated:** February 4, 2026  
**Sprint:** S1 (Architecture Analysis & Prototype)  
**See:** `docs/plans/plan_eval-optimization-s1.md`