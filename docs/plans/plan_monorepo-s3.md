# Plan: Monorepo Sprint 3 - Container Build Verification & Deployment Support

**Status:** 🟡 IN PROGRESS  
**Branch:** `monorepo-s3`  
**Context:** `memory-bank/context-monorepo-deployment.md`  
**Created:** February 10, 2026  
**Sprint Focus:** Verify container build with latest code, get deployment support

---

## Sprint 2 Summary

**Status:** ⚠️ Closed as "Partial Complete"

**Achievements:**
- ✅ App Runner Terraform module created (ECR + service + IAM)
- ✅ Health check fixes applied (HOSTNAME, /api/healthcheck route, middleware)
- ✅ CORS configuration updated
- ✅ All infrastructure code complete
- ✅ Docker image builds and pushes to ECR

**Blockers:**
- ❌ App Runner deployment stalled (health check timeout)
- ⏸️ Deployment interrupted, status unknown

**Lessons Learned:**
- Health check configuration is critical (path, auth exclusion, HOSTNAME binding)
- Template placeholders must be replaced before building
- Local container testing is essential before cloud deployment

---

## Sprint 3 Goals

### Primary Goals
1. **Sync with Latest Code** - Integrate eval-studio team's changes from main
2. **Verify Container Build** - Ensure monorepo still builds correctly as container
3. **Get Deployment Support** - Work with team to resolve deployment issues

### Secondary Goals
4. **Document Deployment Process** - Create comprehensive deployment guide
5. **Plan Phase 4** - Prepare for CI/CD workflows

---

## Scope

### ✅ IN SCOPE
- Pull latest main (includes eval-studio changes)
- Verify `pnpm install` and `pnpm build` succeed
- Verify Docker image builds successfully
- Test container locally if possible
- Document any new issues discovered
- Get team support for App Runner deployment
- Archive Sprint 2 (tags created, plan moved to completed/)

### ❌ OUT OF SCOPE
- CI/CD workflow implementation (Phase 4)
- Custom domain configuration
- Load testing
- Migrating existing projects to monorepo pattern

---

## Implementation Steps

### Phase 1: Code Sync & Build Verification
- [x] Close Sprint 2 (create archive tags)
- [x] Pull latest main (eval-studio changes)
- [x] Create Sprint 3 branch (`monorepo-s3`)
- [x] Update context file
- [x] Create Sprint 3 plan
- [ ] Regenerate test project from latest templates
- [ ] Verify `pnpm install` succeeds
- [ ] Verify `pnpm run build` succeeds (all modules + web app)
- [ ] Verify Docker image builds
- [ ] Test container locally (if time permits)

### Phase 2: Deployment Support
- [ ] Review Sprint 2 deployment blockers
- [ ] Work with team to resolve App Runner issues
- [ ] Document deployment process
- [ ] Verify health check configuration
- [ ] Test deployed service

### Phase 3: Documentation & Closure
- [ ] Document Sprint 2 lessons learned
- [ ] Update master plan with Sprint 3 status
- [ ] Create deployment troubleshooting guide
- [ ] Plan Phase 4 (CI/CD workflows)

---

## Success Criteria

### Must-Have
- [ ] Latest code pulled from main (eval-studio changes integrated)
- [ ] Test project regenerated with latest templates
- [ ] All 9 CORA modules build successfully
- [ ] Web app builds successfully
- [ ] Docker image builds successfully
- [ ] Sprint 3 plan complete and documented

### Nice-to-Have
- [ ] Container tested locally and working
- [ ] App Runner deployment successful
- [ ] Health check passes
- [ ] Web app accessible at App Runner URL

---

## Known Issues from Sprint 2

### Critical Fixes Applied (Session 11)
1. **Missing HOSTNAME in Dockerfile** ✅ Fixed
   - Added `ENV HOSTNAME 0.0.0.0`
   - Ensures Next.js binds to all network interfaces

2. **Mismatched Health Check Paths** ✅ Fixed
   - Created `/api/healthcheck` route (matches Terraform)
   - Updated middleware to exclude from auth
   - All paths now aligned

3. **Template Placeholders** ✅ Fixed
   - Dockerfile now uses correct project name
   - No more `{{PROJECT_NAME}}` in build commands

### Deployment Status (Unknown)
- Terraform apply started but interrupted
- App Runner service status unknown
- Health check not confirmed

---

## Test Environment

**Location:** `/Users/aaron/code/bodhix/testing/mono-s1/ai-mod-stack`  
**Config:** `setup.config.mono-s1.yaml`  
**Project Name:** `ai-mod`  
**AWS Account:** 887559014095  
**AWS Profile:** `ai-sec-nonprod`  
**AWS Region:** `us-east-1`

**Will regenerate project fresh in Sprint 3 to ensure all latest changes are included.**

---

## Dependencies

- Eval-studio team changes (merged to main) ✅
- Sprint 2 infrastructure code (merged to main) ✅
- Team availability for deployment support

---

## Timeline

**Estimated Duration:** 1-2 days

**Day 1:**
- Code sync and build verification (2-3 hours)
- Test project regeneration (1 hour)
- Build validation (1 hour)

**Day 2:**
- Deployment support session (with team)
- Documentation and closure (2-3 hours)

---

## Next Steps After This Sprint

### If Deployment Succeeds ✅
- Mark Phase 3 complete
- Start Phase 4: CI/CD Workflows
- Write ADR-024: Monorepo Pattern

### If Deployment Blocked ❌
- Create detailed troubleshooting guide
- Document blockers for team review
- Plan alternative deployment strategies

---

**Plan Status:** 🟡 Active  
**Last Updated:** February 10, 2026 (23:26 EST)  
**Next Update:** After build verification complete