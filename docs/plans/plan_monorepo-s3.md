# Plan: Monorepo Sprint 3 & 4 - Build System & Deployment

**Status:** Sprint 3 - COMPLETE (Infrastructure Proven)  
**Branch:** `monorepo-s3`  
**Context:** `memory-bank/context-monorepo-deployment.md`  
**Created:** February 10, 2026  
**Last Updated:** February 12, 2026 (Session 20)  
**Sprint Focus:** Docker build architecture & App Runner deployment  
**Status:** ✅ COMPLETE

---

## Sprint Overview

| Sprint | Status | Duration | Focus | Outcome |
|--------|--------|----------|-------|---------|
| S3 | ⚠️ Partial | 1 session | App Runner infrastructure | Health check timeout |
| S4 | ✅ Complete | 1 session | Pattern B (tsup + Turborepo) | Build system working |
| S5 | ✅ Complete | 1 session | Template bug fix + deployment | Infrastructure deployed |
| S6 | 🔄 In Progress | TBD | Docker build & App Debugging | Build success / Runtime bug |

---

## Sprint 3 Conclusion (Infrastructure Success)

**Status:** ✅ COMPLETE (February 13, 2026)

**Key Achievements:**
- ✅ **Platform Issue Resolved:** Identified and fixed ARM vs linux/amd64 mismatch (Root cause of health check failures)
- ✅ **Standards Created:** `30_std_infra_DOCKER-AWS.md` and `30_std_infra_DOCKER-MAC.md`
- ✅ **Build System Secured:** Updated Dockerfile with platform verification
- ✅ **Deployment Proven:**
  - ECS Fargate: Successfully deployed hello-world app
  - App Runner: Successfully deployed hello-world app
- ✅ **Strategy Defined:** Created ADR-024 for dual deployment options

**Infrastructure Status:**
- Infrastructure code is correct and working
- Docker build process is fixed
- AWS App Runner and ECS Fargate are viable targets

**Remaining Application Issues:**
- The `ai-mod-stack` application code has missing imports (application development task, not infrastructure)
- These will be addressed in a separate application development sprint

---

## Sprint 5 Summary (Session 18 & 19)

**Status:** ✅ COMPLETE

**Achievements:**
- ✅ Discovered critical template bug in `create-cora-monorepo.sh`
- ✅ Fixed module block generation (correct variable names)
- ✅ All 9 modules deployed successfully to Lambda
- ✅ Infrastructure fully operational
- ✅ Fixed 7 TypeScript build errors
- ✅ Created split Docker architecture (Dockerfile.web + Dockerfile.studio)
- ✅ Added next-auth to both apps (fundamental for auth)

---

## Configuration Summary

### tsup Configuration

**Base config (`tsup.config.base.ts`):**
```typescript
{
  entry: {
    index: 'index.ts',
    'admin/index': 'components/admin/index.ts'
  },
  format: ['esm'],
  outExtension: () => ({ js: '.js' }),  // Critical: outputs .js not .mjs
  dts: false,  // Disabled for speed (add ambient declarations)
  banner: { js: '"use client";' },  // Critical: Next.js App Router
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'next', '@mui/*']
}
```

### Docker Configuration

**Strategy: Pre-Build on Host (Option A)**
1. Build modules on host machine (full context).
2. Copy `dist` folders into Docker.
3. Build only Next.js app in Docker.

**Key Dependencies:**
- `next-auth@5.0.0-beta.30` - Required for Edge Runtime support.

---

## Known Issues & Resolutions

| Issue | Status | Solution |
|-------|--------|----------|
| Docker external deps | ✅ Fixed | Pre-build modules on host (Option A) |
| .env.local quotes | ✅ Fixed | Created clean env file without quotes |
| Duplicate providers | ✅ Fixed | Removed redundant admin/layout.tsx |
| Runtime app error | ❌ Open | `useUser` context missing on admin pages |

---

## Test Environment

**Current Test Project:**
- **Location:** `/Users/aaron/code/bodhix/testing/mono-3/ai-mod-stack`
- **Status:** ✅ Infrastructure deployed, Docker built, App runtime error

**Build Outputs:**
- Docker Image: `ai-mod-web:latest` (259MB)

**AWS Configuration:**
- **AWS Account:** 887559014095
- **AWS Region:** `us-east-1`

---

## Next Session Plan

### 🔴 PRIORITY 1: Debug Application Runtime Error
- Investigate `OrgAdminClientPage.tsx` context usage.
- Verify `UserProviderWrapper` in root layout is correctly wrapping children.
- Check for package version mismatches (NextAuth vs Module dependencies).

### 🟡 PRIORITY 2: Push to ECR
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 887559014095.dkr.ecr.us-east-1.amazonaws.com
docker push 887559014095.dkr.ecr.us-east-1.amazonaws.com/ai-mod-nonprod-web:latest
```

### 🟢 PRIORITY 3: Deploy App Runner
- Configure environment variables (NO QUOTES).
- Deploy via Terraform.

---

**Plan Status:** ⚠️ Sprint 6 In Progress  
**Last Updated:** February 12, 2026 (Session 20)

---

## Sprint 3 Final Update - February 13, 2026

### Status: ✅ COMPLETE (Infrastructure) | ⏭️ Sprint 3b Created (Application Debugging)

### Accomplishments ✅

1. **TypeScript Errors Fixed**
   - Fixed `useOrganizationContext()` hook return types
   - Fixed `OrgAccessAdmin.tsx` never type inference
   - All packages build successfully

2. **Environment Variables Fixed**
   - Discovered and fixed quotes issue in `.env.local`
   - Docker now reads environment variables correctly
   - Container starts without Invalid URL errors

3. **Docker Build & Local Testing**
   - Build successful: 142 seconds
   - Image size: ~259MB
   - Local container runs perfectly on port 3000
   - Auth system working (redirects to signin)

4. **ECR Push**
   - Image: `887559014095.dkr.ecr.us-east-1.amazonaws.com/ai-mod-nonprod-web:latest`
   - Digest: `sha256:3a1eb5180b2fa1fa68f6fc85035c4ed2798149382a5d9a540f0abfb372374f75`

5. **IAM Roles Created**
   - ECR Access Role: `AppRunnerECRAccessRole`
   - Instance Role: `AppRunnerInstanceRole` (with CloudWatch Logs access)

6. **App Runner Services Created**
   - Service 1 (ai-mod-web-nonprod): Failing health checks (incomplete config)
   - Service 2 (ai-mod-web-v2): Failing health checks (complete config but placeholder NEXTAUTH_URL)

### Current Blocker ❌

**Health checks failing on both App Runner services despite correct configurations.**

**Possible causes:**
1. NEXTAUTH_URL placeholder causing issues
2. Health check path `/` returns 307 redirect (might be interpreted as unhealthy)
3. Container startup issues specific to App Runner environment
4. Missing additional required env vars

### Investigation Needed (Next Session)

1. **Check CloudWatch Logs** - Get actual error messages from App Runner
2. **Update NEXTAUTH_URL** - Change from PLACEHOLDER to actual service URL
3. **Test Health Check Configs** - Try different endpoints or create unprotected health endpoint
4. **Review Previous Configs** - Compare with any previous working App Runner deployments

### Key Learnings 📚

**Environment Variables in Docker:**
- DO NOT use quotes in `.env.local` for Docker `--env-file`
- Quotes become part of the value, causing errors like `Invalid URL: "http://localhost:3000"`
- Fix: `sed 's/="\(.*\)"$/=\1/' .env.local`

**App Runner Requirements:**
- **ECR Access Role** - For pulling images from ECR
- **Instance Role** - For CloudWatch Logs and other AWS services
- **AUTH_TRUST_HOST=true** - Required for NextAuth behind App Runner proxy
- **HOSTNAME=0.0.0.0** - Required for Next.js to bind to all interfaces

### Service Details

```
Service 1 (ai-mod-web-nonprod):
- ARN: arn:aws:apprunner:us-east-1:887559014095:service/ai-mod-web-nonprod/776eff312221417c96f6e6138a0d01dc
- URL: https://3fiwah5rp4.us-east-1.awsapprunner.com
- Status: Health checks failing
- Config: Incomplete (missing AUTH_TRUST_HOST, HOSTNAME, Instance Role)

Service 2 (ai-mod-web-v2):
- ARN: arn:aws:apprunner:us-east-1:887559014095:service/ai-mod-web-v2/1624358cfac0439bb6bc69fc1c64faf1
- URL: https://cafdj9btc7.us-east-1.awsapprunner.com
- Status: Health checks failing
- Config: Complete (AUTH_TRUST_HOST, HOSTNAME, Instance Role set)
- Issue: NEXTAUTH_URL still set to PLACEHOLDER
```

### Files Created

Test project: `/Users/aaron/code/bodhix/testing/mono-3/ai-mod-stack/`

Config files:
- `apprunner-config.json` - Service 1 configuration
- `apprunner-config-v2.json` - Service 2 configuration with complete settings
- `apprunner-update-v2.json` - Update config with correct NEXTAUTH_URL
- `apprunner-trust-policy.json` - ECR Access Role trust policy
- `apprunner-instance-trust-policy.json` - Instance Role trust policy

### Next Actions (Priority Order)

1. **IMMEDIATE:** Check CloudWatch Logs for actual errors
2. **HIGH:** Update NEXTAUTH_URL to actual service URL and redeploy
3. **HIGH:** Test different health check configurations
4. **MEDIUM:** Create unprotected health endpoint if needed
5. **LOW:** Clean up failed services once working
6. **FUTURE:** Integrate with Terraform

### Sprint 3 Progress

- [x] Fix TypeScript errors
- [x] Fix start-dev.sh
- [x] Docker build successful
- [x] Container tested locally
- [x] Image pushed to ECR
- [x] IAM roles created
- [x] App Runner services created
- [x] Health checks passing ✅ (Platform issue resolved)
- [x] Service accessible via browser ✅ (Hello world app)
- [x] Terraform integration ✅

**Session ended:** February 13, 2026 2:49 PM EST  
**Status:** Infrastructure complete, Sprint 3b plan created for application debugging

---

## Sprint 3 Completion Summary

### ✅ Infrastructure Achievements

1. **Docker Build Process Fixed:**
   - NEXT_PUBLIC_ environment variables now embedded at build time
   - Build scripts updated to auto-read vars from .env.local
   - Scripts templated for future monorepo projects

2. **Terraform Integration Complete:**
   - App Runner module configured and deployed
   - All 16 environment variables configured
   - Module outputs.tf fixed (ECR conflict resolved)

3. **Deployment Successful:**
   - Service URL: `https://uiqtdybdpx.us-east-1.awsapprunner.com`
   - Health checks passing
   - Infrastructure fully operational

4. **Template Updates:**
   - Build scripts: `build-docker-aws.sh`, `build-docker-local.sh`
   - Terraform configs: `main.tf`, `variables.tf`, `outputs.tf`
   - All changes propagated to template directory

### ⚠️ Application Issues → Sprint 3b

NextAuth authentication errors require application-level debugging:
- `/api/auth/session` endpoint failing
- `/api/auth/_log` returning 400
- Continuous redirect loop

**Action:** Created Sprint 3b plan (`docs/plans/plan_monorepo-s3b.md`) with debugging workflow and root cause hypotheses.

**Next Session:** Follow Sprint 3b plan to resolve authentication issues.

