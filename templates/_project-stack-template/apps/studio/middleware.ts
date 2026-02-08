/**
 * NextAuth.js v5 Middleware for Eval Optimizer
 *
 * This middleware is REQUIRED for NextAuth v5 to work properly.
 * It runs on every request and invokes the `authorized` callback
 * from auth.ts to determine if the user can access the route.
 *
 * Uses the same auth configuration as the main app, ensuring
 * shared authentication across both applications.
 */
import { auth } from "./auth";

export default auth;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};