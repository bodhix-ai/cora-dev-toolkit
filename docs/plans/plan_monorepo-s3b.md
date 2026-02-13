# Plan: Monorepo Sprint 3b - NextAuth Application Debugging

**Status:** Not Started  
**Branch:** `monorepo-s3`  
**Parent Plan:** `plan_monorepo-s3.md`  
**Created:** February 13, 2026  
**Focus:** Debug and resolve NextAuth session and authentication errors

---

## Overview

Sprint 3 successfully deployed the infrastructure (Docker, ECR, App Runner, Terraform). However, the application is experiencing NextAuth runtime errors that prevent user authentication. This sprint focuses on debugging and fixing those application-level issues.

---

## Current State

### ✅ Infrastructure (Complete)
- Docker image built with NEXT_PUBLIC_ variables
- App Runner service running: `https://uiqtdybdpx.us-east-1.awsapprunner.com`
- Health check passing: `/api/healthcheck`
- All runtime environment variables configured
- Build scripts updated to auto-read env vars

### ❌ Application Issues (Blocking)
1. **NextAuth session endpoint failing:**
   - Error: `[next-auth][error][CLIENT_FETCH_ERROR] Failed to fetch`
   - URL: `/api/auth/session`
   - Cause: Endpoint not responding or misconfigured

2. **NextAuth logging endpoint error:**
   - Error: `400 Bad Request`
   - URL: `/api/auth/_log`
   - Cause: Request validation failing

3. **Continuous redirect loop:**
   - Browser repeatedly calls `/api/auth/session`
   - Each call fails, triggering another attempt
   - User cannot access application

---

## Root Cause Hypotheses

### Hypothesis 1: Missing Okta Redirect URI (Most Likely)
**Probability:** High  
**Evidence:** Okta 400 error on redirect URI seen earlier in session

**Test:**
1. Check Okta application settings at:
   - https://simpletech-admin.okta.com/admin/app/oidc_client/instance/0oax0eaf3bgW5NP73697#tab-general
2. Verify these URIs are registered:
   - `https://uiqtdybdpx.us-east-1.awsapprunner.com/api/auth/callback/okta`
   - `https://uiqtdybdpx.us-east-1.awsapprunner.com`

**Fix:**
Add the missing redirect URIs to Okta application settings.

### Hypothesis 2: NextAuth Route Handler Misconfiguration
**Probability:** Medium  
**Evidence:** Both `/api/auth/session` and `/api/auth/_log` failing

**Test:**
1. Read `apps/web/app/api/auth/[...nextauth]/route.ts`
2. Verify NextAuth handler is correctly implemented
3. Check for proper Okta provider configuration

**Fix:**
Correct the NextAuth route handler implementation.

### Hypothesis 3: Runtime Environment Variable Issues
**Probability:** Low  
**Evidence:** Variables were configured in Terraform, but may not be reaching the app

**Test:**
```bash
export AWS_PROFILE=ai-sec-nonprod
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:us-east-1:887559014095:service/ai-mod-dev-web/146ce721ba8643cfadbc3df3a0813afb \
  --region us-east-1 \
  --query 'Service.SourceConfiguration.ImageRepository.ImageConfiguration.RuntimeEnvironmentVariables'
```

**Fix:**
Update App Runner service configuration if variables are missing.

### Hypothesis 4: CORS or Trust Host Issues
**Probability:** Low  
**Evidence:** `AUTH_TRUST_HOST=true` was configured

**Test:**
Check CloudWatch logs for CORS-related errors:
```bash
aws logs tail /aws/apprunner/ai-mod-dev-web/application --follow --region us-east-1
```

---

## Debugging Workflow

### Step 1: Check CloudWatch Logs (CRITICAL)
This will reveal the actual server-side errors.

```bash
export AWS_PROFILE=ai-sec-nonprod
aws logs tail /aws/apprunner/ai-mod-dev-web/application --follow --region us-east-1
```

**What to look for:**
- NextAuth error messages
- Okta API errors
- Missing environment variable errors
- Route handler errors

### Step 2: Test NextAuth Endpoints Directly

```bash
# Test session endpoint
curl -v https://uiqtdybdpx.us-east-1.awsapprunner.com/api/auth/session

# Test providers endpoint
curl -v https://uiqtdybdpx.us-east-1.awsapprunner.com/api/auth/providers

# Test CSRF token endpoint
curl -v https://uiqtdybdpx.us-east-1.awsapprunner.com/api/auth/csrf
```

**Expected responses:**
- `/api/auth/session` should return `{"user":null}` for unauthenticated users
- `/api/auth/providers` should return list of configured providers
- `/api/auth/csrf` should return a CSRF token

### Step 3: Verify Okta Configuration

Check Okta application settings and compare with environment variables:

**Okta Settings:**
- Client ID: `0oax0eaf3bgW5NP73697` (from `okta_audience` in Terraform)
- Domain: `simpletech.okta.com`
- Issuer: `https://simpletech.okta.com/oauth2/default`

**Environment Variables (in App Runner):**
- `OKTA_CLIENT_ID`
- `OKTA_CLIENT_SECRET`
- `OKTA_DOMAIN`
- `OKTA_ISSUER`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

### Step 4: Check NextAuth Route Handler

Read and verify the NextAuth API route:

```bash
# In test project
cat /Users/aaron/code/bodhix/testing/mono-3/ai-mod-stack/apps/web/app/api/auth/[...nextauth]/route.ts
```

**Verify:**
1. NextAuth handler is properly exported
2. Okta provider is configured
3. Callbacks are defined (if needed)
4. Session configuration is correct

### Step 5: Incremental Fixes

Based on findings, apply fixes in this order:

1. **Add Okta redirect URIs** (if missing)
2. **Fix NextAuth route handler** (if misconfigured)
3. **Update environment variables** (if incorrect)
4. **Rebuild and redeploy** Docker image if code changes were made

---

## Test Plan

After each fix, verify:

1. **Health Check:**
   ```bash
   curl https://uiqtdybdpx.us-east-1.awsapprunner.com/api/healthcheck
   ```

2. **NextAuth Session:**
   ```bash
   curl https://uiqtdybdpx.us-east-1.awsapprunner.com/api/auth/session
   ```

3. **Browser Test:**
   - Visit `https://uiqtdybdpx.us-east-1.awsapprunner.com`
   - Should redirect to Okta login
   - After login, should redirect back to app
   - Should not see continuous loop

---

## Files to Review

### Application Code
- `apps/web/app/api/auth/[...nextauth]/route.ts` - NextAuth API route handler
- `apps/web/app/layout.tsx` - Root layout with auth providers
- `packages/shared/hooks/useUnifiedAuth.ts` - Auth hook (if exists)
- `packages/shared/adapters/okta-adapter.ts` - Okta adapter (if exists)

### Configuration
- `apps/web/.env.local` - Local environment variables (reference)
- `envs/dev/local-secrets.tfvars` - Terraform variables
- `modules/app-runner/main.tf` - App Runner configuration

---

## Success Criteria

- [ ] No console errors in browser
- [ ] `/api/auth/session` returns valid response (not 400)
- [ ] `/api/auth/_log` works without errors
- [ ] User can sign in via Okta
- [ ] No redirect loops
- [ ] Application loads after authentication

---

## Rollback Plan

If fixes don't work, can rollback to previous working state:
1. Revert code changes
2. Rebuild Docker image
3. Push to ECR
4. App Runner will auto-deploy

---

## Related Documentation

- NextAuth.js Docs: https://next-auth.js.org
- Okta OAuth 2.0: https://developer.okta.com/docs/guides/implement-oauth-for-okta/
- App Runner Logs: `aws logs tail /aws/apprunner/ai-mod-dev-web/application`

---

**Next Session:** Start with CloudWatch logs review to identify the exact error.