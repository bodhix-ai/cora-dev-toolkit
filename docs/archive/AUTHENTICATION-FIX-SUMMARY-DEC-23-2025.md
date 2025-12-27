# Authentication Redirect Loop Investigation - December 23, 2025

**⚠️ ARCHIVED - SUPERSEDED BY ROOT CAUSE ANALYSIS**

**See:** [REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md](./REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md) - **Complete Diagnosis & Fix Plan**

---

## Summary

**Issue:** UI flickers between authentication states after Okta login  
**Sessions:** 12 debugging sessions (Dec 22-23, 2025)  
**Status:** ✅ **INVESTIGATION COMPLETE** - Root causes identified, fix plan documented  
**Investigation Time:** 18.5 hours total  
**Actual Root Cause:** Backend failures (RLS policies, provider extraction, RPC functions) - NOT frontend/NextAuth issue

---

## Final Status (Dec 23, 6:50 PM) ✅ INVESTIGATION COMPLETE

**This document is now ARCHIVED.** The investigation revealed the issue was NOT a NextAuth v5 frontend problem as initially suspected. The actual root cause is **three interconnected backend failures** from an incomplete Phase 11 table renaming migration.

**For complete technical analysis and fix plan, see:** [REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md](./REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md)

---

## Historical Context (Dec 23, 9:44 AM) - Early Investigation

### What We've Confirmed ✅

**Server-Side Authentication (Working):**
- ✅ Middleware finds JWT token: `[MIDDLEWARE] / - Token: true FOUND`
- ✅ Middleware allows authenticated requests through
- ✅ `/api/auth/session` endpoint returns 200 (server-side)
- ✅ User successfully completes Okta OAuth flow
- ✅ JWT token is set in cookie after Okta callback

**Client-Side Authentication (Broken):**
- ❌ `useSession()` hook stuck on `status: "loading"` 
- ❌ Then transitions to `status: "unauthenticated"`
- ❌ NEVER reaches `status: "authenticated"`
- ❌ Browser console: `ERR_CONNECTION_REFUSED` for client-side fetch to `/api/auth/session`
- ❌ UI flickers between "checking for authentication" and "Welcome to AI-Security"

### Root Cause Identified 🎯

**NextAuth v5 Server/Client Mismatch:**

The application has a **split brain** authentication state:
- **Server-side:** NextAuth can validate JWT token (middleware succeeds)
- **Client-side:** NextAuth `useSession()` hook cannot fetch session (fails with CONNECTION_REFUSED)

This creates an impossible situation where:
1. Server allows the page to load (token valid)
2. Page renders and calls `useSession()`
3. `useSession()` tries to fetch from `/api/auth/session`
4. Fetch fails with CONNECTION_REFUSED (despite server being running)
5. Status becomes "unauthenticated"
6. Page shows sign-in prompt
7. User already HAS a valid token, so cycle repeats

---

## What We Fixed (Template-First) ✅

### 1. Fixed useUnifiedAuth.ts Hook
**Problem:** Used `!!session` which was false during hydration  
**Fix:** Use NextAuth's status instead: `isSignedIn = status === "authenticated"`

```typescript
// Before
const isSignedIn = !!session;

// After
const isSignedIn = status === "authenticated";
```

**Why:** During React hydration, `session` is `null` even when user is authenticated. The `status` field is more reliable.

---

### 2. Removed "/" from Public Routes
**Problem:** Made "/" public to avoid redirect loop (WRONG approach)  
**Fix:** Reverted - "/" should require authentication

```typescript
// middleware.ts - REVERTED
const publicRoutes = [
  // "/" removed - this route requires authentication
  "/auth/signin",
  "/auth/signout",
  "/auth/error",
  "/api/auth",
  "/api/health",
];
```

**Why:** Making "/" public masked the real issue and broke authentication requirements.

---

### 3. Removed isOnPublicPage Check from auth.ts
**Problem:** auth.ts was allowing "/" without authentication  
**Fix:** Reverted the isOnPublicPage check

```typescript
// auth.ts - REMOVED
// const isOnPublicPage = nextUrl.pathname === "/";
// if (isOnAuthPage || isOnErrorPage || isOnSignInPage || isOnPublicPage) {
```

**Why:** Same as #2 - masking the real issue instead of fixing it.

---

### 4. Fixed page.tsx to Handle Auth States
**Problem:** Page assumed user was authenticated  
**Fix:** Added explicit state handling

```tsx
const { profile, isAuthenticated, loading } = useUser();

// Loading state
if (loading) {
  return <LoadingScreen />;
}

// Unauthenticated state
if (!isAuthenticated) {
  return <SignInPrompt />;
}

// Authenticated state
return <Dashboard profile={profile} />;
```

**Why:** Page must gracefully handle all three auth states.

---

### 5. Fixed AppShell to Check Pathname Before Hooks
**Problem:** AppShell called `useUser()` on auth pages, causing errors  
**Fix:** Split into two components

```tsx
export function AppShell({ children }) {
  const pathname = usePathname();
  
  // Check pathname BEFORE calling any hooks
  if (pathname.startsWith("/auth/")) {
    return <>{children}</>;
  }
  
  return <AppShellWithAuth>{children}</AppShellWithAuth>;
}

function AppShellWithAuth({ children }) {
  const { isAuthenticated, loading } = useUser();
  // Safe to call hooks here - not an auth page
  ...
}
```

**Why:** Prevents calling hooks on pages where UserContext isn't available.

---

### 6. Added Debug Logging
**Added to middleware.ts:**
```typescript
console.log(`[MIDDLEWARE] ${pathname} - Token:`, !!token, token ? 'FOUND' : 'NOT FOUND');
```

**Added to useUnifiedAuth.ts:**
```typescript
console.log('[useUnifiedAuth:Okta] status:', status, 'isSignedIn:', isSignedIn);
```

**Why:** Visibility into server-side vs client-side auth state.

---

## The Remaining Issue ⚠️

### Problem: Client-Side Session Fetch Fails

**Evidence from logs:**
```
[MIDDLEWARE] / - Token: true FOUND
[MIDDLEWARE] / - ALLOWING (authenticated)
GET /api/auth/session 200 in 19ms  (server-side SSR)
[useUnifiedAuth:Okta] status: loading isSignedIn: false
GET http://localhost:3000/api/auth/session net::ERR_CONNECTION_REFUSED  (client-side fetch)
[useUnifiedAuth:Okta] status: unauthenticated isSignedIn: false
```

**Analysis:**
1. Server-side `/api/auth/session` works (200 OK)
2. Client-side fetch to same endpoint fails (CONNECTION_REFUSED)
3. This happens WHILE dev server is running
4. Creates split brain: server thinks authenticated, client thinks not

### Why This Happens

**Hypothesis 1: NextAuth v5 SessionProvider Configuration**
- Career app works with SAME SessionProvider setup
- But ai-sec doesn't
- Suggests subtle difference in NextAuth config (callbacks, session strategy, etc.)

**Hypothesis 2: Client-Side Fetch Being Blocked**
- Could be CORS issue (unlikely for same-origin)
- Could be Next.js dev server issue
- Could be SessionProvider basePath misconfiguration

**Hypothesis 3: Session Callback Not Returning Data**
- JWT callback might be working (server-side auth works)
- But session callback might not be exposing data to client
- Client-side `useSession()` depends on session callback

---

## User Experience

**What the user sees:**
1. Opens app in incognito browser
2. Redirected to /auth/signin (correct)
3. Clicks "Sign In with Okta"
4. Completes Okta authentication
5. Redirected back to /
6. **UI FLICKERS** between:
   - "Checking for authentication..." (loading state)
   - "Welcome to AI-Security - Sign In with Okta" (unauthenticated state)
7. Never reaches dashboard

**Why it flickers:**
- Page loads with `useSession()` status = "loading"
- Status changes to "unauthenticated" (because fetch fails)
- Page re-renders showing sign-in prompt
- Sign-in prompt might trigger re-check
- Cycle repeats

---

## Comparison with Working Career App

**Both apps use:**
- NextAuth v5
- Okta provider
- SessionProvider without passing session prop
- Same middleware pattern with getToken()

**Career app works, ai-sec doesn't.**

**Conclusion:** Subtle difference in:
- NextAuth callbacks (jwt/session)
- Environment variables
- SessionProvider configuration
- Or something in the client-side fetch mechanism

---

## Next Steps

### Required Investigation

1. **Compare NextAuth auth.ts files:**
   - Career: `~/code/sts/career/sts-career-stack/apps/frontend/auth.ts`
   - ai-sec: `/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/auth.ts`
   - Look for differences in: callbacks, session config, cookie settings

2. **Compare environment variables:**
   - Check both .env.local files
   - Ensure NEXTAUTH_URL, NEXTAUTH_SECRET, Okta vars match format

3. **Test SessionProvider from career app:**
   - Copy career's SessionProvider wrapper to ai-sec
   - See if it resolves the issue

4. **Check NextAuth versions:**
   - Ensure both projects use same next-auth version
   - Check if there are breaking changes

5. **Enable NextAuth debug mode:**
   ```typescript
   // In auth.ts
   export const { handlers, auth, signIn, signOut } = NextAuth({
     debug: true,
     // ... rest of config
   })
   ```

---

## Files Modified (All Changes in Templates First)

### Templates (cora-dev-toolkit)
1. `templates/_cora-core-modules/module-access/frontend/hooks/useUnifiedAuth.ts`
2. `templates/_project-stack-template/apps/web/middleware.ts`
3. `templates/_project-stack-template/apps/web/auth.ts`
4. `templates/_project-stack-template/apps/web/app/page.tsx`
5. `templates/_project-stack-template/apps/web/components/AppShell.tsx`
6. `templates/_cora-core-modules/module-access/frontend/contexts/UserContext.tsx`

### Test Project (ai-sec - copied from templates)
1. `/Users/aaron/code/sts/test2/ai-sec-stack/packages/module-access/frontend/hooks/useUnifiedAuth.ts`
2. `/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/middleware.ts`
3. `/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/auth.ts`
4. `/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/app/page.tsx`
5. `/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/components/AppShell.tsx`
6. `/Users/aaron/code/sts/test2/ai-sec-stack/packages/module-access/frontend/contexts/UserContext.tsx`

---

## Sessions Log

### Session 1-8 (Dec 22)
- Removed Zustand stores (ADR-008)
- Fixed various TypeScript errors
- Investigated redirect loop
- ❌ No resolution

### Session 9 (Dec 22 Evening)
- Made "/" public route (WRONG approach)
- Fixed TypeScript compilation errors
- ❌ Broke authentication

### Session 10 (Dec 23 Morning)
- Reverted "/" public route changes
- Added comprehensive debug logging
- ✅ **IDENTIFIED ROOT CAUSE**: Server/client auth split brain
- ⚠️ Solution still pending

---

## Success Criteria

The issue will be FIXED when:
1. ✅ User can log in with Okta
2. ✅ After login, user sees dashboard (not sign-in prompt)
3. ✅ No UI flickering between states
4. ✅ `useSession()` status becomes "authenticated"
5. ✅ Page refreshes maintain authentication
6. ✅ No redirect loops
7. ✅ Logout works correctly

---

---

## SESSION 12 UPDATE (Dec 23, 2025 - 1:00 PM - 3:47 PM)

### Infrastructure Deployment Success ✅

**Major Achievement:** Successfully deployed test3 project, confirming the redirect loop is **frontend-specific**, NOT infrastructure-related.

### What Was Accomplished

**1. Fixed Deployment Script ✅**
- AWS profile sourcing in `update-env-from-terraform.sh` now works correctly
- Used proper bash pattern: `set -a; source .env; set +a`
- Frontend `.env.local` successfully updated with API Gateway URL

**2. Fixed OIDC Provider Import ✅**
- Created `temp-oidc-import.sh` script
- Successfully imported existing OIDC provider to Terraform state
- Script handles all required variables automatically
- Deployment proceeded without errors

**3. Deployed test3 Infrastructure ✅**
- All 4 deployment steps completed successfully
- API Gateway: `https://hk5bzq4kv3.execute-api.us-east-1.amazonaws.com/`
- Lambda functions deployed
- DynamoDB tables created
- Environment variables updated

**4. Created Long-Term OIDC Solution ✅**
- Implementation plan: `OIDC-PROVIDER-MULTI-ENV-IMPLEMENTATION-PLAN.md`
- Auto-detection of existing providers
- Shared infrastructure pattern (one OIDC provider per AWS account)
- Estimated 4-6 hours to implement

### Key Finding

**The infrastructure is working correctly.** The redirect loop issue is isolated to the frontend NextAuth configuration in test2.

**Evidence:**
- ✅ test3 infrastructure deployed successfully
- ✅ All AWS resources created without errors
- ✅ Deployment scripts functioning properly
- ⚠️ Redirect loop STILL persists in test2 (frontend issue)

### Conclusion

The authentication redirect loop is **NOT** an infrastructure problem. It's a NextAuth v5 client-side configuration issue specific to the test2 project's frontend.

**Next session should investigate:**
- NextAuth client-side session handling in test2
- Package version differences between test2 and test3
- Environment-specific frontend configuration
- Possible need to rebuild test2 frontend using test3 template

---

---

## Final Resolution (Dec 23, 6:50 PM)

**Actual Root Cause:** Backend failures, NOT frontend NextAuth issue

**Three Backend Issues Identified:**

1. **RLS Policy Issues** (CRITICAL) - 406 errors blocking database queries
   - Phase 11 table renaming didn't recreate RLS policies
   - Affects: `user_auth_ext_ids`, `user_invites`, `org_email_domains`
   
2. **Missing Provider Context** - Authorizer data not being extracted
   - `get_user_from_event()` doesn't extract `provider` field
   
3. **Stale RPC Functions** - Referencing renamed tables
   - `log_auth_event()` still references old table name

**Fix Plan:** Documented in [REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md](./REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md)

**Estimated Fix Time:** ~45 minutes

---

**Status:** 📦 **ARCHIVED** - Investigation complete, see root cause analysis document  
**Investigation Complete:** December 23, 2025, 6:50 PM EST  
**Total Sessions:** 12 (Dec 22-23, 2025)  
**Total Investigation Time:** 18.5 hours  
**Next Step:** Implement the 3 fixes documented in root cause analysis
