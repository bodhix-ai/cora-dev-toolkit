# CORA Monorepo Deployment Context

**Last Updated:** February 13, 2026
**Status:** Sprint 3 - Infrastructure Complete | Sprint 3b - IN PROGRESS (Application Debugging)

---

## Current Sprint: Sprint 3b - NextAuth Application Debugging

**🎯 CRITICAL:** Sprint 3 is not fully complete until the application works end-to-end. Infrastructure deployment is proven, but the application must be fully functional with working authentication before closing Sprint 3.

### Objectives
1. Debug NextAuth session endpoint failures
2. Fix Okta redirect URI configuration
3. Resolve continuous redirect loop
4. Enable user authentication
5. Verify end-to-end application functionality

### Sprint 3b Status: 🔄 IN PROGRESS (Next Priority)

---

## Sprint 3 Summary: Infrastructure Deployment ✅ INFRASTRUCTURE COMPLETE (Application Debugging Required)

### Objectives (All Complete)
1. ✅ Fix remaining TypeScript errors
2. ✅ Verify Docker build with NEXT_PUBLIC_ variables
3. ✅ Push to ECR
4. ✅ Deploy to App Runner (Platform issue fixed)
5. ✅ Terraform integration (Verified)
6. ✅ Update build scripts to auto-read env vars

---

## Session Summary (February 13, 2026)

### ✅ Infrastructure Accomplishments (Sprint 3)

1. **NEXT_PUBLIC_ Variables Fixed**
   - **Root Cause:** Docker images were built without `NEXT_PUBLIC_` environment variables, causing runtime errors.
   - **Solution:** 
     - Added build arg support to Dockerfile.web
     - Rebuilt image with all 4 NEXT_PUBLIC_ variables as build args
     - Variables now embedded at build time (required by Next.js)
   - **Variables Configured:**
     - `NEXT_PUBLIC_AUTH_PROVIDER=okta`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_CORA_API_URL`

2. **Build Script Improvements**
   - **Updated:** `scripts/build-docker-aws.sh` and `scripts/build-docker-local.sh`
   - **Feature:** Auto-read `NEXT_PUBLIC_` vars from `apps/web/.env.local`
   - **Benefit:** Users no longer need to manually pass build args
   - **Templated:** Scripts copied to `templates/_project-monorepo-template/scripts/`

3. **Terraform App Runner Integration**
   - **Uncommented:** App Runner module in `envs/dev/main.tf`
   - **Configured:** All 16 runtime environment variables from `.env.local`
   - **Fixed:** Module outputs.tf (removed ECR output conflict)
   - **Deployed:** Service successfully created via Terraform

4. **Deployment Verification**
   - **Service URL:** `https://uiqtdybdpx.us-east-1.awsapprunner.com`
   - **Health Checks:** Passing (`/api/healthcheck`)
   - **Infrastructure:** Fully operational
   - **Cleanup:** Deleted 14 experimental App Runner services

5. **Platform Compatibility** (Previous Sprint)
   - **Root Cause:** Building on ARM (M1/M2) Mac created `linux/arm64` images
   - **Solution:** Enforced `--platform linux/amd64` in Docker builds
   - **Standards Created:** `30_std_infra_DOCKER-AWS.md` and `30_std_infra_DOCKER-MAC.md`

### ⚠️ Application Issues (Sprint 3b - Next Session)

The infrastructure is complete and working, but the application has NextAuth runtime errors:

1. **NextAuth Session Endpoint Failing:**
   - Error: `[next-auth][error][CLIENT_FETCH_ERROR] Failed to fetch`
   - URL: `/api/auth/session`
   - Impact: Users cannot authenticate

2. **NextAuth Logging Endpoint Error:**
   - Error: `400 Bad Request`
   - URL: `/api/auth/_log`
   - Impact: Error logging not working

3. **Continuous Redirect Loop:**
   - Browser repeatedly calls `/api/auth/session`
   - Each call fails, triggering another attempt
   - Impact: Application unusable

**Action:** Sprint 3b plan created (`docs/plans/plan_monorepo-s3b.md`) for debugging and resolution in next session.

---

## Next Sprint: Sprint 3b - NextAuth Application Debugging

### Goals
1. Check CloudWatch logs for actual NextAuth errors
2. Test NextAuth API endpoints directly (`/session`, `/providers`, `/csrf`)
3. Verify Okta redirect URI configuration
4. Fix NextAuth route handler if misconfigured
5. Resolve redirect loop issue
6. Enable successful user authentication

### Debugging Plan
See detailed plan: `docs/plans/plan_monorepo-s3b.md`

**Root Cause Hypotheses:**
1. **Missing Okta Redirect URI** (Most Likely) - New App Runner URL not registered in Okta
2. **NextAuth Route Handler Misconfiguration** (Medium) - API route not properly implemented
3. **Runtime Environment Variables** (Low) - Variables not reaching application
4. **CORS/Trust Host Issues** (Low) - Proxy configuration problem

### Future Sprint: Sprint 4 - Dual Deployment Infrastructure

After Sprint 3b resolves the application issues, Sprint 4 will focus on:
1. Create reusable Terraform modules (`modules/ecs-web`, `modules/apprunner-web`)
2. Implement environment-based deployment selection
3. Update `create-cora-monorepo.sh` to support dual options
4. Create deployment guides for both paths

---

## Files & Resources

### Key Standards
- `docs/standards/30_std_infra_DOCKER-AWS.md`
- `docs/arch decisions/ADR-024-DUAL-DEPLOYMENT-OPTIONS.md`

### Test Project Location
```
Stack: /Users/aaron/code/bodhix/testing/mono-3/ai-mod-stack
Infra: /Users/aaron/code/bodhix/testing/mono-3/ai-mod-infra
```

### Docker Scripts
- `scripts/build-docker-aws.sh` (REQUIRED for deployment)
- `scripts/build-docker-local.sh` (Faster for local dev)
- `scripts/verify-docker-platform.sh` (CI/CD check)

---

## Key Learnings

### Docker Platform Compatibility
**CRITICAL:** AWS Container services (ECS, App Runner, Lambda) strictly require `linux/amd64` architecture.
- **Symptom:** Silent health check failures, "Exec format error" in logs.
- **Fix:** `docker build --platform linux/amd64 ...`
- **Verification:** `docker inspect image | jq '.[0].Architecture'` must be `amd64`.

### Deployment Cost & Compliance
- **App Runner:** Excellent for dev/prototypes (scales to zero, saves ~$15/mo).
- **ECS Fargate:** Required for FedRAMP/production (steady traffic cost efficiency).
- **Strategy:** Support both via Terraform modules.

---

## Sprint Progress Tracking

### Sprint 3 Checklist
- [x] Fix TypeScript errors in admin pages
- [x] Fix start-dev.sh script  
- [x] Docker build successful
- [x] Container tested locally
- [x] Image pushed to ECR
- [x] IAM roles created
- [x] App Runner services created
- [x] Health checks passing (Platform fix)
- [x] Service accessible via browser
- [x] Terraform integration

### Blockers Resolved
1. ✅ **Health Checks:** Resolved by fixing Docker platform mismatch.
2. ✅ **Env Vars:** Fixed quoting issue in .env files.

---

**Status:** Sprint 3 Infrastructure Complete - Sprint 3b (Application Debugging) is Next Priority
**Date:** February 13, 2026

**Important Note:** Sprint 3 is considered fully complete only when:
- ✅ Infrastructure is deployed (COMPLETE)
- ⏳ Application is fully functional with working authentication (Sprint 3b IN PROGRESS)
- ⏸️ Sprint 4 is deferred until Sprint 3b completes
