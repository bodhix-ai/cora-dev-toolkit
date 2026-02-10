# Context: Mono-Repo Deployment & App Runner

**Initiative:** Consolidate two-repo pattern to mono-repo + deploy to AWS App Runner  
**Status:** Phase 1 COMPLETE ✅ - Ready for Phase 2  
**Priority:** P0 🔴 Critical (Deploying web app)  
**Created:** February 9, 2026  
**Last Updated:** February 9, 2026 (20:45 EST)

---

## Quick Links

- **Plan:** `docs/plans/plan_app-runner-monorepo.md`
- **Branch:** `monorepo-s1`
- **Template:** `templates/_project-monorepo-template/` (creating)
- **Script:** `scripts/create-cora-monorepo.sh` (creating)

---

## Executive Summary

This initiative consolidates the two-repo CORA pattern (`{project}-infra` + `{project}-stack`) into a single mono-repo and deploys the Next.js web application to AWS App Runner as a containerized service.

**Key Goals:**
1. Create new mono-repo template alongside existing templates (zero-impact)
2. Deploy `apps/web` to AWS App Runner (web-first, studio deferred)
3. Maintain 100% backward compatibility with existing two-repo projects
4. Establish reusable patterns for future CORA projects

**Timeline:** 5-6 working days (realistic estimate)

---

## Current Phase: Phase 2 - Build Readiness (NEXT)

**Phase 1 Status:** ✅ COMPLETE (100%)

**Phase 1 Deliverables:**
- [x] Template directory created (165 files, 27,900+ lines)
- [x] Terraform module paths updated for monorepo
- [x] Infra scripts updated (REPO_ROOT, PACKAGES_DIR)
- [x] Dockerfile + .dockerignore created
- [x] CI/CD workflow placeholders created
- [x] create-cora-monorepo.sh script created (full-featured)
- [x] All scripts executable and tested (--dry-run)

**Phase 2 Objective:** Ensure `pnpm run build` succeeds from `apps/web`

**Phase 2 Tasks (NEXT):**
1. Generate test project using `create-cora-monorepo.sh`
2. Run `pnpm install` and `pnpm run build`
3. Fix TypeScript errors
4. Remove Clerk references
5. Validate Docker build
6. Test container locally

---

## Phase Roadmap

### Phase 1: Template Structure (1 day) — **CURRENT**
Create merged mono-repo template

### Phase 2: Build Readiness (2-3 days) — **CRITICAL PATH**
- Validate `pnpm run build` works
- Fix TypeScript errors
- Remove Clerk references
- Create Dockerfile
- Update Next.js config for standalone output

### Phase 3: App Runner Infrastructure (1 day)
- Create Terraform module for App Runner + ECR
- Update CORS headers
- Integrate into `envs/dev/main.tf`

### Phase 4: CI/CD Workflows (1 day)
- Create `deploy-infra.yml` (Terraform)
- Create `deploy-app.yml` (Docker → ECR → App Runner)

### Phase 5: Validation & Documentation (0.5 day)
- End-to-end test
- Write ADR-022
- Update .clinerules and toolkit scripts

---

## Strategic Decisions (Resolved)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Template Strategy | New `_project-monorepo-template/` alongside existing | Zero risk to existing projects |
| App Runner Deployment | Web-first (studio deferred) | Validate pattern with main app first |
| Container Build | Root Dockerfile using `pnpm deploy --filter=web --prod` | Industry standard for pnpm monorepos |
| CI/CD Architecture | Separate workflows (infra + app) | Different triggers, tooling, and failure modes |
| CORS Strategy | Wildcard in dev, explicit origins in prod | Simple for dev, secure for production |
| Clerk Cleanup | Remove Clerk adapter, keep interface pattern | Clean codebase, preserve extensibility |

---

## Risk Mitigation

### Zero-Impact Guarantee

| Legacy Asset | Impact | Protection |
|--------------|--------|------------|
| `_project-infra-template/` | ❌ Not touched | New template in separate directory |
| `_project-stack-template/` | ❌ Not touched | New template in separate directory |
| `create-cora-project.sh` | ❌ Not touched | New script is separate file |
| pm-app-infra / pm-app-stack | ❌ Not affected | Different repos, different pattern |

### Rollback Strategy

If mono-repo pattern fails:
1. Delete `_project-monorepo-template/` directory
2. Delete `create-cora-monorepo.sh` script
3. Revert `.clinerules` and memory-bank updates
4. **Result:** Toolkit returns to exact pre-project state

---

## Critical Path: Phase 2 Build Readiness

**The critical path is getting `pnpm run build` to succeed.**

**Risk Assessment:**
- **Low (1 day):** Templates already build cleanly (TypeScript errors resolved in S8)
- **Medium (2-3 days):** Minor type errors in module frontends
- **High (5 days):** Cascading errors across workspace dependencies

**Mitigation:** Test build immediately after Phase 1 to assess real timeline.

---

## Hybrid Development Workflow

To ensure toolkit remains source of truth while enabling rapid iteration:

1. **Template First:** Build `_project-monorepo-template/` skeleton in toolkit
2. **Generate Real Project:** Create `ai-mod-stack` using create-cora-monorepo.sh
3. **Iterate in Real Project:** DevOps engineer works in `ai-mod-stack` to get build/Docker/App Runner working
4. **Sync Back to Template:** When something works in `ai-mod-stack`, copy fix to template
5. **Validate Template:** Regenerate from template periodically to ensure it produces working project

---

## Parallel Work: Eval-Studio Module Team

**Situation:** Another team is working on the eval-studio module in parallel.

### Branching Strategy Recommendations

**For Eval-Studio Team:**
1. **Branch from main:** Always branch from latest `main` (not from monorepo branches)
2. **Focus on module code only:** Changes should be in `templates/_modules-functional/module-eval-studio/`
3. **Avoid infrastructure changes:** Don't modify `templates/_project-infra-template/` or `templates/_project-stack-template/`
4. **Coordinate on conflicts:** If both teams touch same files, communicate merge strategy

**For Mono-Repo Team:**
1. **Don't modify module-eval-studio:** Avoid changes to eval-studio module code during Phase 1-3
2. **Module integration in Phase 4-5:** Test eval-studio compatibility after template is stable
3. **Sync point:** Coordinate with eval-studio team before Phase 5 deployment

### Merge Conflict Prevention

| File/Directory | Mono-Repo Team | Eval-Studio Team | Conflict Risk |
|----------------|----------------|------------------|---------------|
| `templates/_project-infra-template/` | ✅ Reads only | ❌ Avoid | Low |
| `templates/_project-stack-template/` | ✅ Reads only | ❌ Avoid | Low |
| `templates/_modules-functional/module-eval-studio/` | ❌ Avoid | ✅ Owns | Low |
| `templates/_modules-core/` | ❌ Avoid | ❌ Avoid | None |
| `.clinerules` | ✅ May update | ❌ Avoid | Low |
| `memory-bank/` | ✅ May update | ❌ Avoid | None |

### Recommended Workflow

**Eval-Studio Team:**
```bash
# Start work
git checkout main
git pull origin main
git checkout -b feature/eval-studio-<feature>

# Make changes to module-eval-studio only
# Commit and push

# Create PR targeting main
# Merge frequently to avoid drift
```

**Mono-Repo Team:**
```bash
# Start work
git checkout main
git pull origin main
git checkout -b feature/monorepo-phase<N>

# Make changes to toolkit only (not module code)
# Commit and push

# Create PR targeting main
# Coordinate with eval-studio team if conflicts arise
```

### Merge Coordination

**Best Practice:** Merge smaller, focused PRs frequently rather than large, long-lived branches.

**Communication Points:**
1. **Daily standup:** Share which files each team is working on
2. **Before PR merge:** Check if other team has open PRs touching same files
3. **After merge:** Both teams pull latest `main` and rebase if needed

---

## Success Metrics

### Phase 1 Success ✅ COMPLETE
- [x] Template directory structure complete (165 files, 27,900+ lines)
- [x] Terraform module paths updated correctly
- [x] Infra scripts updated for monorepo paths
- [x] Dockerfile + .dockerignore created
- [x] CI/CD workflow placeholders created
- [x] Generation script creates valid mono-repo (tested with --dry-run)
- [x] All scripts executable and ready for testing

### Overall Initiative Success
- [ ] Web app deploys to App Runner
- [ ] API Gateway integration works (CORS validated)
- [ ] GitHub Actions workflows deploy successfully
- [ ] ADR-022 written and approved
- [ ] Zero impact on legacy templates and projects

---

## Recent Updates

### February 9, 2026 (20:45 EST) - Phase 1 COMPLETE ✅

**All Deliverables:**
- ✅ Created `_project-monorepo-template/` with merged structure (165 files, 27,900+ lines)
- ✅ Updated `envs/dev/main.tf` module paths for mono-repo
- ✅ Removed github-oidc-role module (using STS central OIDC)
- ✅ Root config files in place (.gitignore, README.md, package.json, etc.)
- ✅ Updated infra scripts: build-cora-modules.sh, deploy-lambda.sh (monorepo paths)
- ✅ Created Dockerfile (multi-stage Next.js + pnpm monorepo)
- ✅ Created .dockerignore
- ✅ Created CI/CD workflow placeholders (deploy-infra.yml, deploy-app.yml)
- ✅ Created scripts/create-cora-monorepo.sh (full-featured creation script)
- 📊 **Progress:** Phase 1 is 100% complete (8/8 tasks)
- ✅ **Status:** READY FOR PHASE 2

**Commits:**
- `81dbfc4` - "feat(templates): create mono-repo template foundation (Phase 1)"
- `9a94a1d` - "docs(monorepo): update context and plan with Phase 1 progress"
- `3f44d4b` - "feat(monorepo): complete Phase 1 - mono-repo template structure"

**Key Changes:**
- INFRA_ROOT → REPO_ROOT in all scripts
- STACK_REPO → PACKAGES_DIR (local packages/)
- Module source: `../../packages/{module}` (not `../../../{project}-stack/`)
- Single git repo instead of two sibling repos

**Next Steps:**
- Generate test project: `./scripts/create-cora-monorepo.sh test-mono --dry-run`
- Validate: `pnpm install && pnpm run build` (Phase 2)

### February 9, 2026 - Initiative Start
- Created context document
- Created branch: `monorepo-s1`
- Paused Sprint S9 to prioritize deployment
- Coordinated with eval-studio team on branching strategy

---

**Next Update:** After Phase 1 completion (remaining 3 tasks) or Phase 2 start
