/**
 * Dynamic Authentication Middleware
 *
 * This middleware protects routes that require authentication.
 * Automatically uses the correct auth provider based on NEXT_PUBLIC_AUTH_PROVIDER:
 * - clerk: Uses Clerk's clerkMiddleware
 * - okta: Uses NextAuth's withAuth middleware
 *
 * @see https://clerk.com/docs/references/nextjs/clerk-middleware
 * @see https://next-auth.js.org/configuration/nextjs#middleware
 */

import { clerkMiddleware } from "@clerk/nextjs/server";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "clerk";

/**
 * Public routes for Okta/NextAuth (don't require authentication)
 */
const oktaPublicRoutes = [
  "/auth/signin",
  "/auth/signout",
  "/auth/error",
  "/api/auth",
  "/api/health",
];

/**
 * Check if a path is a public route for Okta
 */
function isOktaPublicRoute(pathname: string): boolean {
  return oktaPublicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Middleware for Clerk authentication
 */
function clerkAuthMiddleware(req: NextRequest) {
  return clerkMiddleware()(req);
}

/**
 * Middleware for Okta/NextAuth authentication
 */
const oktaAuthMiddleware = withAuth(
  function middleware(req) {
    // If we reach here, user is authenticated (withAuth handles the check)
    // Add any additional middleware logic here (e.g., role-based access)
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow public routes
        if (isOktaPublicRoute(pathname)) {
          return true;
        }

        // Require token for protected routes
        return !!token;
      },
    },
    pages: {
      signIn: "/api/auth/signin",
      error: "/api/auth/error",
    },
  }
);

/**
 * Main middleware - dynamically selects auth provider
 */
export default function middleware(req: NextRequest) {
  if (AUTH_PROVIDER === "clerk") {
    return clerkAuthMiddleware(req);
  }

  if (AUTH_PROVIDER === "okta") {
    return oktaAuthMiddleware(req);
  }

  // Fallback: allow request through
  console.warn(
    `[middleware] Unknown AUTH_PROVIDER: ${AUTH_PROVIDER}, allowing request`
  );
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
