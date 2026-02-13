# Plan: App Runner Deployment + Mono-Repo Consolidation

**Status:** Sprint 3 - COMPLETE (Infrastructure Proven)
**Created:** February 9, 2026  
**Last Updated:** February 13, 2026
**Estimated Timeline:** 5-6 working days (Day 4 - addressing discovered gaps)  
**Risk Level:** Medium (8 missing functions in script, App Runner deployment blocked)

---

## Executive Summary

This plan consolidates the two-repo CORA pattern (`{project}-infra` + `{project}-stack`) into a single mono-repo and deploys the Next.js web application to AWS App Runner as a containerized service.

**🚨 CRITICAL UPDATE (Feb 11, 2026):** Comprehensive script analysis revealed 8 missing functions in `create-cora-monorepo.sh`. Sprint 2A marked as incomplete pending function porting.

**Key Goals:**
1. Create a new mono-repo template (`_project-monorepo-template`) alongside existing templates ✅
2. Port all automation features from `create-cora-project.sh` ⚠️ (8 functions missing)
3. Deploy `apps/web` to AWS App Runner (web-first, studio deferred) ✅ (Infrastructure proven)
4. Maintain 100% backward compatibility with existing two-repo projects (pm-app) ✅
5. Establish reusable patterns for future CORA projects

**Recent Discoveries:**
- Template structure complete (165 files) ✅
- Script missing 8 critical functions ❌
- Database migrations not executed ❌
- Functional module routes not copied ❌
- No validation suite execution ❌

**What Changes:**
- New template structure combining infra + stack into single repo
- Infrastructure (Terraform) moves to repo root (`envs/`, `lambdas/`, `modules/`)
- Apps and packages stay in current locations (`apps/`, `packages/`)
- New App Runner Terraform module for containerized deployments
- Split CI/CD workflows (`deploy-infra.yml` + `deploy-app.yml`)
- Remove github-oidc-role module (use STS central hub-and-spoke OIDC)

**What Stays the Same:**
- Existing templates (`_project-infra-template`, `_project-stack-template`) untouched
- Existing `create-cora-project.sh` script untouched
- pm-app and all current projects unaffected
- Core/functional module templates unchanged

---

## Strategic Decisions (Resolved)

### Decision 1: Mono-Repo Template Strategy
**Choice:** Create new `_project-monorepo-template/` alongside existing templates  
**Rationale:** Zero risk to existing projects; can deprecate old templates once mono-repo is proven

### Decision 2: App Runner — One Service or Two?
**Choice:** Web-first (deploy web now, studio deferred)  
**Rationale:** Validate pattern with main app; studio follows same pattern later

### Decision 3: Container Build Strategy
**Choice:** Root Dockerfile using `pnpm deploy --filter=web --prod`  
**Rationale:** Industry standard for pnpm monorepos with Next.js standalone

### Decision 4: CI/CD Pipeline Architecture
**Choice:** Separate workflows (`deploy-infra.yml` + `deploy-app.yml`)  
**Rationale:** Different triggers, tooling, and failure modes; keeps concerns separated

### Decision 5: CORS Strategy
**Choice:** Wildcard (`[\"*\"]`) in dev, explicit origins via tfvars in stg/prd  
**Rationale:** Simple for dev, secure for production; add explicit headers for reliability

### Decision 6: Clerk Cleanup Scope
**Choice:** Remove Clerk adapter but keep adapter interface pattern  
**Rationale:** Clean codebase while preserving extensibility for future providers

---

## Risk Mitigation: Legacy Process Coexistence

### Zero-Impact Guarantee

| Legacy Asset | Impact | Protection Mechanism |
|--------------|--------|---------------------|
| `_project-infra-template/` | ❌ Not touched | New template is in separate directory |
| `_project-stack-template/` | ❌ Not touched | New template is in separate directory |
| `create-cora-project.sh` | ❌ Not touched | New script (`create-cora-monorepo.sh`) is separate file |
| pm-app-infra / pm-app-stack | ❌ Not affected | Different repos, different pattern |
| Module templates | ✅ Read-only | Both patterns reference but don't modify |
| Validation scripts | ✅ Enhanced | Add mono-repo detection, no breaking changes |
| `.clinerules` | ✅ Additive | Add mono-repo sections, existing rules preserved |

### Rollback Strategy

If the mono-repo pattern fails validation:
1. Delete `_project-monorepo-template/` directory
2. Delete `create-cora-monorepo.sh` script
3. Revert `.clinerules` and memory-bank updates
4. **Result:** Toolkit returns to exact pre-project state

---

## Architecture Overview

### Mono-Repo Structure

```
{project}/  (single repo)
├── .github/workflows/
│   ├── deploy-infra.yml      # Terraform plan/apply
│   └── deploy-app.yml         # Docker build → ECR → App Runner
├── apps/
│   ├── web/                   # Main Next.js app (port 3000)
│   └── studio/                # Eval Studio (port 3001, deferred)
├── packages/
│   ├── module-access/         # Core modules
│   ├── module-ai/
│   ├── module-ws/
│   ├── module-mgmt/
│   ├── module-kb/
│   ├── module-chat/
│   ├── api-client/            # Shared packages
│   ├── shared-types/
│   ├── contracts/
│   └── shared/
├── org-common/                # Python layer for Lambdas
├── envs/                      # Terraform environments (from infra)
│   └── dev/
│       ├── main.tf            # Updated module paths
│       ├── variables.tf
│       ├── backend.tf
│       └── providers.tf
├── lambdas/                   # Lambda source (from infra)
│   └── api-gateway-authorizer/
├── modules/                   # Terraform modules (from infra)
│   ├── modular-api-gateway/
│   ├── app-runner/            # NEW
│   └── secrets/
├── scripts/                   # Merged scripts from both repos
│   ├── build-cora-modules.sh
│   ├── deploy-terraform.sh
│   ├── deploy-lambda.sh
│   ├── start-dev.sh
│   └── start-studio.sh
├── bootstrap/                 # From infra
│   └── bootstrap_tf_state.sh
├── Dockerfile                 # NEW - Multi-stage Next.js build
├── .dockerignore              # NEW
├── pnpm-workspace.yaml
└── package.json
```

### Terraform Module Path Changes

**Before (two-repo):**
```hcl
module "module_access" {
  source = "../../../{project}-stack/packages/module-access/infrastructure"
}
```

**After (mono-repo):**
```hcl
module "module_access" {
  source = "../../packages/module-access/infrastructure"
}
```

### App Runner Architecture

```
GitHub Actions
    │
    ├─> Build Docker Image (pnpm monorepo + Next.js standalone)
    │
    ├─> Push to ECR
    │
    └─> Deploy to App Runner
            │
            ├─> Health Check: GET /api/health
            ├─> Environment Variables: NEXT_PUBLIC_API_URL, OKTA_*, SUPABASE_*
            └─> Connects to API Gateway (CORS configured)
```

---

## Implementation Sprints

### Sprint 1: Mono-Repo Template Structure (1 day) ✅ COMPLETE

**Objective:** Create `_project-monorepo-template/` by merging infra + stack templates

**Tasks:**
1. ✅ Create `templates/_project-monorepo-template/` directory
2. ✅ Copy `_project-stack-template/` as base (apps/, packages/, org-common/, pnpm-workspace.yaml)
3. ✅ Copy from `_project-infra-template/`:
   - `envs/` → `envs/`
   - `lambdas/` → `lambdas/`
   - `modules/` → `modules/`
   - `bootstrap/` → `bootstrap/`
   - `scripts/` → merge with existing `scripts/`
4. ✅ Update `envs/dev/main.tf`:
   - Change module source paths: `../../../{project}-stack/packages/` → `../../packages/`
   - Remove `github-oidc-role` module block
5. ✅ Create `.github/workflows/` with placeholders for two workflows
6. ✅ Add `.dockerignore` and placeholder `Dockerfile`
7. ✅ Create `scripts/create-cora-monorepo.sh` (copy from `create-cora-project.sh`, modify for single-repo output)
8. ✅ Update infra scripts for monorepo paths (build-cora-modules.sh, deploy-lambda.sh)

**Progress:** 8/8 tasks complete (100%) ✅

**Acceptance Criteria:**
- [x] Template directory exists with merged structure (165 files, 27,900+ lines)
- [x] Terraform module paths updated to local references
- [x] Infra scripts updated for monorepo paths (REPO_ROOT, PACKAGES_DIR)
- [x] Docker configuration created (Dockerfile + .dockerignore)
- [x] CI/CD workflow placeholders created
- [x] create-cora-monorepo.sh generates a valid mono-repo project (tested with --dry-run)
- [x] All scripts executable and ready for Phase 2 testing

---

### Sprint 2A: Automation Porting (1 day) ✅ COMPLETE

**Objective:** Port all automation features from `create-cora-project.sh` to achieve feature parity

**What Was Initially Ported (5 functions):**
1. ✅ `generate_env_files()` - Creates .env.local and validation .env
2. ✅ `generate_terraform_vars()` - Creates local-secrets.tfvars
3. ✅ `consolidate_database_schemas()` - Merges 50+ module schemas
4. ✅ `install_validation_deps()` - Creates Python venv for validators
5. ✅ `build_packages()` - Runs pnpm install + build
6. ✅ `merge_module_configs()` - Merges module config files

**Revised Acceptance Criteria:**
- [x] All automation functions ported from two-repo script
- [x] Config file parsing works correctly ✅
- [x] Environment files generated automatically ✅
- [x] Database schemas consolidated automatically ✅
- [x] Validation dependencies installed automatically ✅
- [x] Package build attempted (pnpm install succeeded) ✅

---

### Sprint 2B: Build Readiness (0.5-1 day) ✅ COMPLETE

**Objective:** Fix web app build issues and achieve clean build

**Status:** ✅ ALL 9 CORA MODULES BUILD SUCCESSFULLY (Major Milestone!)

**Progress:**
- [x] Fixed module-kb type errors (SysKbAdmin.tsx, OrgKbAdmin.tsx)
- [x] Fixed hardcoded imports across 6 files in 4 modules
- [x] Created/fixed tsconfig.json files (module-mgmt, module-eval-studio)
- [x] Fixed 12 studio app type errors (deferred remaining per plan)
- [x] Created monorepo-specific workflow (fix-and-sync-mono.md)
- [x] ALL 9 CORA MODULES BUILD SUCCESSFULLY! 🎉
- [x] Updated next.config.mjs with all missing transpilePackages (7 added)
- [x] Fixed admin component exports in module-voice, module-eval, module-kb
- [x] Standardized web app imports to use main entry point (not /admin subpath)
- [x] Regenerated test project multiple times with fixes

**Acceptance Criteria:**
- [x] Module-kb type error fixed in template
- [x] ALL 9 CORA modules build successfully (achieved!)
- [x] Studio app type errors partially fixed (12 errors in 3 files)
- [x] Module admin component exports fixed (voice, eval, kb)
- [x] next.config.mjs updated with all transpilePackages
- [x] Web app imports standardized (main entry point, not /admin subpath)
- [x] **RESOLVED:** All build issues fixed (10 total issues resolved)
- [x] Web app builds successfully (29 pages, zero errors)
- [x] `pnpm run build` succeeds with zero errors
- [x] Dockerfile builds successfully: `docker build -t test-web .` ✅
- [x] Container runs locally: `docker run -p 3000:3000 test-web` ✅
- [x] Health check passes: `curl http://localhost:3000/api/health` → HTTP 200 OK ✅

---

### Sprint 3: App Runner Deployment & Platform Fix (2 days) ✅ COMPLETE

**Objective:** Create Terraform module for App Runner + ECR, fix platform issues, and prove deployment

**Status:** Infrastructure deployed, platform issues resolved, deployment proven with hello-world app.

**Key Achievements:**
- ✅ Identified root cause of health check failures: ARM vs linux/amd64 platform mismatch
- ✅ Created `30_std_infra_DOCKER-AWS.md` standard for AWS builds
- ✅ Created `30_std_infra_DOCKER-MAC.md` standard for local development
- ✅ Updated Dockerfile with platform verification
- ✅ Successfully deployed hello-world app to **BOTH** App Runner and ECS Fargate
- ✅ Created ADR-024 to formalize dual deployment strategy

**Result:** Service deploys and reaches RUNNING status. Health check passes on both services.

**Acceptance Criteria:**
- [x] App Runner module created with all resources
- [x] Module integrated into `envs/dev/main.tf`
- [x] CORS headers explicitly configured
- [x] `terraform plan` succeeds with no errors
- [x] Docker image builds correctly for AWS (linux/amd64)
- [x] App Runner service healthy

---

### Sprint 4: Dual Deployment Infrastructure (1-2 days)

**Objective:** Implement infrastructure-as-code templates for both ECS Fargate and App Runner

**Tasks:**
1. Create Terraform modules for ECS and App Runner
2. Implement environment-based deployment selection
3. Update `create-cora-monorepo.sh` to support dual options
4. Create deployment guides for both paths
5. Validate both deployment types with test project

**Deliverables:**
- `modules/ecs-web/` and `modules/apprunner-web/`
- Updated environment templates
- `guide_DEPLOY-ECS.md` and `guide_DEPLOY-APPRUNNER.md`

---

### Sprint 5: CI/CD Workflows (1 day)

**Objective:** Create GitHub Actions workflows for infra and app deployments

**Tasks:**
1. Create deploy-infra.yml
2. Create deploy-app.yml

**Acceptance Criteria:**
- [ ] Both workflows created in `_project-monorepo-template/.github/workflows/`
- [ ] Workflows use placeholders ({{PROJECT_NAME}}, {{AWS_REGION}})
- [ ] create-cora-monorepo.sh replaces placeholders correctly

---

### Sprint 6: Validation & Documentation (0.5 day)

**Objective:** Test end-to-end and document the new pattern

**Tasks:**
1. End-to-End Test
2. Update Documentation
3. Update Toolkit Scripts

**Acceptance Criteria:**
- [ ] Complete end-to-end deployment succeeds
- [ ] Web app accessible at App Runner URL
- [ ] API Gateway calls work (CORS validated)
- [ ] ADR written and reviewed
- [ ] All documentation updated

---

## Timeline & Difficulty Assessment

### Effort Breakdown

| Sprint | Tasks | Optimistic | Realistic | Pessimistic |
|-------|-------|-----------|-----------|-------------|
| **Sprint 1: Template Structure** | File reorganization, path updates, create script | 0.5 day | 1 day | 1.5 days |
| **Sprint 2: Build Readiness** | Fix TypeScript errors, Dockerfile, Clerk cleanup | 1 day | 2-3 days | 5 days |
| **Sprint 3: App Runner TF** | Create module, integrate, CORS config | 0.5 day | 1 day | 2 days |
| **Sprint 4: Dual Deployment** | ECS/App Runner templates, documentation | 1 day | 2 days | 3 days |
| **Sprint 5: CI/CD** | Two workflows, OIDC integration | 0.5 day | 1 day | 2 days |
| **Sprint 6: Validation** | Testing, ADR, docs | 0.5 day | 0.5 day | 1 day |
| **Total** | | **4 days** | **7-8 days** | **14 days** |

### Critical Path

**The critical path is Sprint 2: Build Readiness**, specifically getting `pnpm run build` to succeed.

---

## Success Criteria

### Must-Have (MVP)

- [ ] `_project-monorepo-template/` exists and is complete
- [ ] `create-cora-monorepo.sh` generates a valid mono-repo project
- [ ] `pnpm run build` succeeds in generated project
- [ ] Docker build succeeds and container runs locally
- [ ] App Runner service deploys successfully via Terraform
- [ ] Web app accessible at App Runner URL
- [ ] API Gateway integration works (CORS validated)
- [ ] GitHub Actions workflows deploy successfully
- [ ] Legacy templates and scripts untouched (zero impact)
- [ ] ADR-022 written and approved

### Nice-to-Have (Future)

- [ ] Studio app deployed to second App Runner service
- [ ] Custom domain configured (Route53 + ACM)
- [ ] CloudWatch dashboards for App Runner metrics
- [ ] Load testing and auto-scaling validation
- [ ] Migrate pm-app to mono-repo pattern

---

## Next Steps

1. **Close Sprint 3** — Confirm platform fix and deployment success
2. **Begin Sprint 4** — Create Terraform modules for dual deployment
3. **Fix Application Issues** — Resolve missing imports in `ai-mod-stack` web app

---
