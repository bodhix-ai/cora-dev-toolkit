# ADR-007: CORA App Shell & Authentication Standard

**Status:** PROPOSED  
**Date:** December 22, 2025  
**Authors:** AI Development Team  
**Supersedes:** Previous ad-hoc auth implementations

---

## Industry Standards Alignment

This ADR aligns with official recommendations from:

### Next.js Official Documentation
- **[Middleware for Authentication](https://nextjs.org/docs/app/building-your-application/authentication#optimistic-checks-with-middleware-optional)**: "Use Middleware for optimistic checks. Use Middleware to redirect the user if they're not authenticated." 
- **[Route Protection Pattern](https://nextjs.org/docs/app/building-your-application/authentication#protecting-routes-with-middleware)**: Middleware runs before every request, making it ideal for authentication checks.
- **[Avoid Client-Side Redirects](https://nextjs.org/docs/app/building-your-application/routing/redirecting)**: Server-side redirects are preferred to avoid flash of unauthorized content.

### NextAuth.js (Auth.js) Best Practices
- **[SessionProvider at Root](https://next-auth.js.org/getting-started/client#sessionprovider)**: "The `SessionProvider` should wrap your entire application."
- **[Middleware Pattern](https://next-auth.js.org/configuration/nextjs#middleware)**: "The most basic form of protecting pages is to check for session and redirect."
- **[JWT Validation](https://next-auth.js.org/configuration/nextjs#wrap-middleware)**: Use `getToken()` in middleware for server-side JWT validation.

### Why Client-Side AuthRouter Components Are Problematic

Industry experts consistently warn against client-side authentication redirects:

1. **Flash of Unauthorized Content (FOUC)**: The page renders before redirect, exposing protected content momentarily.
2. **Hydration Mismatches**: Server renders one thing, client redirects to another.
3. **Re-render Loops**: `useEffect` + `router.push()` can create infinite loops when state changes trigger re-renders.
4. **SEO Issues**: Search engines may index protected pages before redirect.

The Next.js documentation explicitly states: *"Avoid using `useEffect` for authentication redirects as this can lead to a flash of unauthenticated content."*

---

## Context

The ai-sec project has experienced persistent authentication re-render loops after implementing a complex auth flow with:
- Dynamic provider switching (Clerk/Okta)
- Route groups separating auth pages from main pages
- `AuthRouter` component doing client-side redirects based on profile state
- Multiple nested providers (AuthProvider → UserProviderWrapper → AuthRouter)

Meanwhile, the working **policy** (Clerk) and **career** (Okta/NextAuth) projects use simpler patterns that don't have these issues.

## Decision

CORA projects should follow a **simplified auth pattern** that:

1. **Uses middleware for ALL authentication redirects** (not client-side)
2. **Has a flat provider hierarchy** (no nested redirect logic)
3. **Supports both Clerk and Okta** through environment configuration
4. **Does NOT use client-side AuthRouter components** that redirect

## The CORA Auth Shell Standard

### 1. Root Layout Structure

```tsx
// app/layout.tsx
import { AuthProvider } from "module-access";
import { ThemeRegistry } from "../components/ThemeRegistry";
import { UserProvider } from "module-access";
import { AppShell } from "../components/AppShell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* AuthProvider wraps SessionProvider (Okta) or ClerkProvider (Clerk) */}
        <AuthProvider>
          <ThemeRegistry>
            {/* UserProvider loads profile from API */}
            <UserProvider>
              <AppShell>{children}</AppShell>
            </UserProvider>
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Key points:**
- Single root layout for ALL pages (including auth pages)
- NO route groups like `(main)` for authenticated pages
- AuthProvider → ThemeRegistry → UserProvider → AppShell → children
- NO AuthRouter component

### 2. Middleware Handles Authentication

```typescript
// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "clerk";

const publicRoutes = [
  "/auth/signin",
  "/auth/signout",
  "/auth/error",
  "/api/auth",
  "/api/health",
  "/sign-in",
  "/sign-up",
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // For Clerk: Use Clerk's middleware
  if (AUTH_PROVIDER === "clerk") {
    // Clerk handles its own auth - just pass through
    // Or use: return clerkMiddleware()(req);
    return NextResponse.next();
  }

  // For Okta/NextAuth: Check JWT token
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}
```

**Key points:**
- ALL authentication redirects happen in middleware
- No client-side redirects for auth
- Token check happens server-side before React renders

### 3. AuthProvider (Dynamic Provider Selection)

```tsx
// module-access/frontend/components/AuthProvider.tsx
"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { SessionProvider } from "next-auth/react";

type AuthProviderType = "clerk" | "okta";

function getActiveAuthProvider(): AuthProviderType {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER as AuthProviderType;
  return provider || "clerk";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const provider = getActiveAuthProvider();

  if (provider === "clerk") {
    return (
      <ClerkProvider
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      >
        {children}
      </ClerkProvider>
    );
  }

  // Okta via NextAuth
  return <SessionProvider>{children}</SessionProvider>;
}
```

### 4. UserProvider (Profile Loading)

```tsx
// module-access/frontend/components/UserProvider.tsx
"use client";

import { createContext, useContext, ReactNode } from "react";
import useSWR from "swr";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import { createCoraAuthenticatedClient } from "@${project}/api-client";

interface UserContextType {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, getToken, isLoading: authLoading } = useUnifiedAuth();

  const { data: profile, error, isLoading: profileLoading } = useSWR(
    isSignedIn ? "/profiles/me" : null,
    async () => {
      const token = await getToken();
      if (!token) return null;
      const client = createCoraAuthenticatedClient(token);
      const response = await client.get<Profile>("/profiles/me");
      return response;
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  return (
    <UserContext.Provider
      value={{
        profile: profile || null,
        loading: authLoading || profileLoading,
        error: error?.message || null,
        isAuthenticated: isSignedIn,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
```

**Key points:**
- NO redirects in UserProvider
- Just loads profile data if authenticated
- Uses SWR for caching and deduplication

### 5. AppShell (Conditional UI Based on Auth State)

```tsx
// components/AppShell.tsx
"use client";

import { useUser } from "module-access";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { LoadingScreen } from "./LoadingScreen";

/**
 * AppShell - Main application shell
 * 
 * CRITICAL: Split into two components to avoid calling useUser() on auth pages.
 * Calling hooks unconditionally before checking pathname causes rendering errors
 * (ERR_INCOMPLETE_CHUNKED_ENCODING) when the UserContext isn't available yet.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Auth pages don't need the shell - return BEFORE calling any hooks
  // This prevents accessing UserContext on pages where user might not be authenticated
  if (pathname.startsWith("/auth/") || pathname.startsWith("/sign-")) {
    return <>{children}</>;
  }

  // For non-auth pages, use the full shell with profile checks
  return <AppShellWithProfile>{children}</AppShellWithProfile>;
}

/**
 * AppShellWithProfile - The actual app shell that requires authentication
 * 
 * This component is only rendered for non-auth pages, so it's safe to call useUser()
 */
function AppShellWithProfile({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, profile } = useUser();

  // Show loading while auth state is being determined
  if (loading) {
    return <LoadingScreen />;
  }

  // Show access denied if user requires invitation
  if (profile?.requiresInvitation) {
    return <AccessDeniedPage />;
  }

  // Normal authenticated user - show full app shell
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

**Key points:**
- **Split component pattern** - Check pathname BEFORE calling hooks
- Conditional UI rendering (not redirects)
- Shows loading state while auth is being determined
- Shows access denied in-place (no redirect)
- **Prevents rendering errors** by avoiding hook calls on auth pages

## What We're Removing

### ❌ AuthRouter Component (DELETE THIS)

The `AuthRouter` component that does client-side redirects based on profile state should be REMOVED. It causes re-render loops because:

1. It runs a redirect during render or in useEffect
2. The redirect causes navigation
3. Navigation causes component re-mount
4. The redirect logic runs again
5. Loop continues

### ❌ Route Groups for Auth

Don't use route groups like `(main)` to separate authenticated pages. Keep everything in the root layout.

### ❌ Multiple Redirect Sources

With middleware handling redirects, don't add additional redirect logic in:
- AuthRouter components
- useEffect hooks
- Page components

## Implementation Checklist

### For New CORA Projects

- [ ] Use single root layout (no route groups for auth)
- [ ] Add AuthProvider → ThemeRegistry → UserProvider → AppShell
- [ ] Configure middleware for auth redirects
- [ ] Set NEXT_PUBLIC_AUTH_PROVIDER environment variable
- [ ] NO AuthRouter component

### For Existing Projects (ai-sec)

- [ ] Remove `(main)` route group - move pages to root
- [ ] Remove AuthRouter component
- [ ] Update root layout to include UserProvider and AppShell
- [ ] Keep middleware (it's working correctly)
- [ ] Test with both Clerk and Okta configurations

## Environment Variables

```env
# Choose auth provider: "clerk" or "okta"
NEXT_PUBLIC_AUTH_PROVIDER=okta

# For Okta/NextAuth
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
OKTA_CLIENT_ID=your-client-id
OKTA_CLIENT_SECRET=your-client-secret
OKTA_ISSUER=https://your-tenant.okta.com/oauth2/default

# For Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

## Summary

| Aspect | Old (Broken) | New (Standard) |
|--------|--------------|----------------|
| Auth redirects | AuthRouter + middleware | Middleware only |
| Route structure | Route groups `(main)` | Single root layout |
| Provider nesting | AuthProvider → UserProviderWrapper → AuthRouter | AuthProvider → UserProvider |
| Profile-based routing | Client-side redirects | Conditional UI rendering |
| Loading states | During redirects | In-place loading UI |

## References

- Working project: `policy/pm-app-stack` (Clerk)
- Working project: `career/sts-career-stack` (Okta/NextAuth)
- Broken project: `security/ai-sec-stack` (over-engineered)

---

**Document Version:** 1.0  
**Status:** PROPOSED - Awaiting review and approval
