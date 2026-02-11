/**
 * NextAuth.js v5 Middleware
 *
 * This middleware is REQUIRED for NextAuth v5 to work properly.
 * It runs on every request and invokes the `authorized` callback
 * from auth.ts to determine if the user can access the route.
 *
 * Without this file, authentication will not work.
 */
import { auth } from "./auth";
import { NextRequest, NextResponse } from "next/server";

// Wrap auth middleware to exclude health check endpoint
export default function middleware(request: NextRequest) {
  // Allow health check endpoint without authentication
  if (request.nextUrl.pathname === "/api/healthcheck") {
    return NextResponse.next();
  }

  // Apply auth middleware to all other routes
  return auth(request as any);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
