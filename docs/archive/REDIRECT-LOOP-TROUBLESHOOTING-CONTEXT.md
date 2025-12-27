# Authentication Loop Troubleshooting - INVESTIGATION COMPLETE

**⚠️ ARCHIVED - SUPERSEDED BY ROOT CAUSE ANALYSIS**

**See:** [REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md](./REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md) - **Complete Diagnosis & Fix Plan**

---

**Last Updated:** December 23, 2025, 6:50 PM EST  
**Status:** ✅ **INVESTIGATION COMPLETE** - All root causes identified  
**Sessions:** 12 debugging sessions (Dec 22-23, 2025)  
**Investigation Time:** 18.5 hours total

---

## EXECUTIVE SUMMARY

**This document is now ARCHIVED.** The investigation revealed the issue was NOT a NextAuth v5 frontend problem as initially suspected.

**Initial Symptom:** After logging in with Okta, the application entered a redirect loop or UI flickering state.

**Initially Suspected Cause:** NextAuth v5 server/client authentication mismatch ❌ INCORRECT

**Actual Root Cause:** Three interconnected backend failures ✅ CORRECT
1. **RLS Policy Issues** - 406 errors from incomplete Phase 11 table renaming
2. **Missing Provider Context** - Authorizer data not being extracted
3. **Stale RPC Functions** - Referencing renamed tables

**For complete technical analysis:** See [REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md](./REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md)

---

## THE DEBUGGING JOURNEY (10+ Sessions)

### Session 1-8: Various Hypotheses Tested

**What We Tried:**
- ✅ Removed all Zustand stores (ADR-008 implementation)
- ✅ Fixed UserContext loading logic
- ✅ Fixed AppShell to bypass auth pages correctly
- ✅ Verified all components have correct logic
- ✅ Fixed TypeScript compilation errors

**Result:** ❌ None of these fixed the core issue

**Learning:** The problem was NOT in our state management or component logic.

---

### Session 9: Wrong Approach (Made "/" Public)

**What We Did:**
- Made "/" a public route in both middleware.ts and auth.ts
- Thought this would stop the redirect loop

**Result:** ❌ Created worse problems
- App no longer required login
- Stuck on "Loading your session..." forever
- UserContext tried to fetch profile with no session

**Learning:** This was masking the real issue, not fixing it.

---

### Session 10: Root Cause Identified

**What We Discovered:**

1. **Added comprehensive logging:**
   ```
   [MIDDLEWARE] / - Token: true FOUND
   [MIDDLEWARE] / - ALLOWING (authenticated)
   GET /api/auth/session 200 in 19ms  (server-side)
   [useUnifiedAuth:Okta] status: loading isSignedIn: false
   GET http://localhost:3000/api/auth/session net::ERR_CONNECTION_REFUSED (client-side)
   [useUnifiedAuth:Okta] status: unauthenticated isSignedIn: false
   ```

2. **Analysis:**
   - ✅ Server-side auth works perfectly (middleware finds token)
   - ❌ Client-side auth fails (useSession() can't fetch)
   - This creates a "split brain" state

3. **User Experience:**
   - User logs in with Okta successfully
   - Redirected back to app
   - UI flickers between loading and sign-in prompt
   - Never reaches dashboard

**Learning:** This is a NextAuth v5 configuration issue, not our code.

---

## ROOT CAUSE: NextAuth v5 Server/Client Mismatch

### How NextAuth v5 Works

**Two Authentication Methods:**

1. **Server-Side (Working):**
   ```typescript
   // middleware.ts
   const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
   // Returns JWT token ✅
   ```

2. **Client-Side (Broken):**
   ```typescript
   // useSession() hook
   const { data: session, status } = useSession();
   // Tries to fetch from /api/auth/session
   // Gets ERR_CONNECTION_REFUSED ❌
   ```

### The Mismatch

- **Middleware uses `getToken()`** - Directly validates JWT from cookie ✅
- **Client uses `useSession()`** - Fetches from `/api/auth/session` endpoint ❌

The JWT token EXISTS and is VALID, but the client-side fetch fails mysteriously.

---

## WHAT WE FIXED

### 1. Reverted "/" Public Route Changes ✅

**Files Changed:**
- `middleware.ts` - Removed "/" from publicRoutes
- `auth.ts` - Removed isOnPublicPage check

**Why:** "/" SHOULD require authentication. Making it public was masking the real issue.

---

### 2. Fixed useUnifiedAuth.ts Hook ✅

**Change:**
```typescript
// Before
const isSignedIn = !!session;

// After  
const isSignedIn = status === "authenticated";
```

**Why:** During hydration, `session` is null even when authenticated. Using `status` is more reliable.

---

### 3. Fixed page.tsx to Handle All Auth States ✅

**Added:**
```tsx
const { profile, isAuthenticated, loading } = useUser();

if (loading) return <LoadingScreen />;
if (!isAuthenticated) return <SignInPrompt />;
return <Dashboard profile={profile} />;
```

**Why:** Page must gracefully handle loading, unauthenticated, and authenticated states.

---

### 4. Fixed AppShell Component Split ✅

**Change:**
```tsx
export function AppShell({ children }) {
  const pathname = usePathname();
  
  // Check pathname BEFORE calling hooks
  if (pathname.startsWith("/auth/")) {
    return <>{children}</>;
  }
  
  return <AppShellWithAuth>{children}</AppShellWithAuth>;
}
```

**Why:** Prevents calling useUser() on auth pages where UserContext isn't available.

---

### 5. Added Debug Logging ✅

**Added to middleware.ts:**
```typescript
console.log(`[MIDDLEWARE] ${pathname} - Token:`, !!token, token ? 'FOUND' : 'NOT FOUND');
console.log(`[MIDDLEWARE] ${pathname} - ${token ? 'ALLOWING (authenticated)' : 'REDIRECTING to /auth/signin'}`);
```

**Added to useUnifiedAuth.ts:**
```typescript
console.log('[useUnifiedAuth:Okta] status:', status, 'isSignedIn:', isSignedIn, 'session:', !!session);
```

**Why:** Visibility into what's happening server-side vs client-side.

---

## THE REMAINING ISSUE ⚠️

### Problem Statement

**Server-side authentication works, client-side doesn't.**

### Evidence

```
# Server-side (Working)
[MIDDLEWARE] / - Token: true FOUND
[MIDDLEWARE] / - ALLOWING (authenticated)
GET /api/auth/session 200 in 19ms

# Client-side (Broken)  
[useUnifiedAuth:Okta] status: loading isSignedIn: false
GET http://localhost:3000/api/auth/session net::ERR_CONNECTION_REFUSED
[useUnifiedAuth:Okta] status: unauthenticated isSignedIn: false
```

### Why This Happens

**Three Hypotheses:**

#### Hypothesis 1: NextAuth Configuration Difference

The working career app and broken ai-sec app have subtle differences in:
- NextAuth callbacks (jwt/session)
- Session strategy configuration
- Cookie settings

**Action:** Compare auth.ts files between career and ai-sec

#### Hypothesis 2: SessionProvider Setup

The SessionProvider might be configured differently or missing required props.

**Action:** Compare SessionProvider implementations

#### Hypothesis 3: Client-Side Fetch Being Blocked

Something is preventing the client-side fetch to `/api/auth/session` even though:
- The server is running
- The endpoint responds to server-side requests
- There's no CORS issue (same origin)

**Action:** Enable NextAuth debug mode, check network tab more carefully

---

## COMPARISON: Career (Working) vs AI-Sec (Broken)

### Both Use:
- ✅ NextAuth v5
- ✅ Okta provider
- ✅ SessionProvider without passing session prop
- ✅ Middleware with getToken() for JWT validation
- ✅ Same file structure

### Career Works, AI-Sec Doesn't

**Conclusion:** Subtle difference in NextAuth configuration (callbacks, session strategy, or environment variables).

---

## NEXT STEPS (Required Investigation)

### 1. Compare NextAuth Configurations

**Files to Compare:**
```bash
# Career (working)
~/code/sts/career/sts-career-stack/apps/frontend/auth.ts

# AI-Sec (broken)
/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/auth.ts
```

**Look for differences in:**
- Callbacks (jwt, session)
- Session strategy
- Cookie configuration
- Provider configuration

---

### 2. Compare Environment Variables

**Files to Compare:**
```bash
# Career
~/code/sts/career/sts-career-stack/apps/frontend/.env.local

# AI-Sec
/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/.env.local
```

**Check:**
- NEXTAUTH_URL format
- NEXTAUTH_SECRET format
- Okta configuration (CLIENT_ID, CLIENT_SECRET, ISSUER)

---

### 3. Enable NextAuth Debug Mode

**In auth.ts:**
```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true, // Add this
  providers: [...],
  callbacks: {...},
  // ... rest
});
```

**Why:** Will log detailed information about what NextAuth is doing.

---

### 4. Test Career's SessionProvider

**Copy this file to ai-sec:**
```bash
# From career
~/code/sts/career/sts-career-stack/apps/frontend/components/providers/SessionProvider.tsx

# To ai-sec
/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/components/SessionProvider.tsx
```

**Update imports and test if it resolves the issue.**

---

### 5. Check NextAuth Versions

**Command:**
```bash
# Career
cd ~/code/sts/career/sts-career-stack/apps/frontend
npm list next-auth

# AI-Sec
cd /Users/aaron/code/sts/test2/ai-sec-stack/apps/web
pnpm list next-auth
```

**Ensure both use the same version.**

---

## FILES MODIFIED (All Template-First)

### Templates (cora-dev-toolkit)
1. `templates/_cora-core-modules/module-access/frontend/hooks/useUnifiedAuth.ts`
2. `templates/_project-stack-template/apps/web/middleware.ts`
3. `templates/_project-stack-template/apps/web/auth.ts`
4. `templates/_project-stack-template/apps/web/app/page.tsx`
5. `templates/_project-stack-template/apps/web/components/AppShell.tsx`
6. `templates/_cora-core-modules/module-access/frontend/contexts/UserContext.tsx`

### Test Project (ai-sec)
1. `/Users/aaron/code/sts/test2/ai-sec-stack/packages/module-access/frontend/hooks/useUnifiedAuth.ts`
2. `/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/middleware.ts`
3. `/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/auth.ts`
4. `/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/app/page.tsx`
5. `/Users/aaron/code/sts/test2/ai-sec-stack/apps/web/components/AppShell.tsx`
6. `/Users/aaron/code/sts/test2/ai-sec-stack/packages/module-access/frontend/contexts/UserContext.tsx`

---

## SUCCESS CRITERIA

The issue will be FIXED when:

1. ✅ User can log in with Okta
2. ✅ After login, `useSession()` status becomes "authenticated"
3. ✅ No UI flickering between states
4. ✅ Dashboard loads with user data
5. ✅ Page refreshes maintain authentication
6. ✅ No redirect loops or flickering
7. ✅ Logout works correctly

---

## KEY LEARNINGS

### 1. Template-First Workflow is Critical
All fixes were made to templates first, then copied to test project. This ensures future projects don't have the same issues.

### 2. Server-Side vs Client-Side Auth
In NextAuth v5:
- Server-side uses `getToken()` (direct JWT validation)
- Client-side uses `useSession()` (fetches from API endpoint)
- These can get out of sync if configuration is wrong

### 3. Don't Mask Issues with Workarounds
Making "/" public stopped the redirect loop but created worse problems. Always fix the root cause.

### 4. Comprehensive Logging is Essential
Without logging both server-side and client-side, we wouldn't have identified the split brain issue.

### 5. Compare with Working Projects
The career app provided a reference implementation that helped narrow down the issue.

---

---

## SESSION 12 UPDATE (Dec 23, 2025 - 1:00 PM - 3:47 PM)

### Infrastructure Deployment Success ✅

**Key Finding:** The redirect loop issue is **frontend-specific**, NOT infrastructure-related.

**Evidence:**
- ✅ test3 project infrastructure deployed successfully
- ✅ All 4 deployment steps completed (bootstrap, terraform, lambdas, env vars)
- ✅ API Gateway configured: `https://hk5bzq4kv3.execute-api.us-east-1.amazonaws.com/`
- ✅ OIDC provider imported and managed
- ⚠️ Redirect loop STILL persists in test2 project (frontend issue)

### Work Completed

**1. Fixed Deployment Script ✅**
- Fixed AWS profile sourcing in `update-env-from-terraform.sh` using `set -a; source .env; set +a`
- Environment variables successfully updated in frontend `.env.local`

**2. Fixed OIDC Provider Import ✅**
- Created `temp-oidc-import.sh` script with all required variables
- Successfully imported existing OIDC provider to Terraform state
- Deployment proceeded without "EntityAlreadyExists" errors

**3. Created Long-Term Solution Plan ✅**
- `OIDC-PROVIDER-MULTI-ENV-IMPLEMENTATION-PLAN.md` created
- Comprehensive 7-phase implementation plan
- Estimated 4-6 hours to implement permanent solution

### Conclusion

**The infrastructure is working correctly.** The redirect loop issue is isolated to the frontend NextAuth configuration in test2. This confirms that:

- Infrastructure deployment scripts are functioning properly
- OIDC provider setup is correct
- The issue is in the NextAuth client-side session management

**Next Session Should Focus On:**
- Deep dive into NextAuth v5 client-side configuration
- Compare test2 vs test3 frontend setup
- Investigate why `useSession()` hook fails in test2

---

---

## Final Resolution (Dec 23, 6:50 PM)

**Investigation Complete:** ✅

**Actual Root Cause:** Backend failures (NOT NextAuth frontend issue)

**Three Backend Issues:**

1. **RLS Policy Issues** (CRITICAL)
   - Phase 11 table renaming didn't recreate RLS policies
   - Causes 406 errors on: `user_auth_ext_ids`, `user_invites`, `org_email_domains`
   
2. **Missing Provider Context**
   - `get_user_from_event()` doesn't extract `provider` field from authorizer
   
3. **Stale RPC Functions**
   - `log_auth_event()` still references old table name `auth_event_log`

**Fix Plan:** See [REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md](./REDIRECT-LOOP-ROOT-CAUSE-ANALYSIS.md)

**Estimated Fix Time:** ~45 minutes

---

**Status:** 📦 **ARCHIVED** - Investigation complete, see root cause analysis document  
**Investigation Complete:** December 23, 2025, 6:50 PM EST  
**Total Sessions:** 12 (Dec 22-23, 2025)  
**Total Investigation Time:** 18.5 hours  
**Next Step:** Implement the 3 fixes documented in root cause analysis
