/**
 * Auth Layout
 * 
 * Minimal layout for auth pages (signin, signout, error).
 * 
 * NO providers needed here - root layout already provides:
 * - AuthProvider (SessionProvider)
 * - ThemeRegistry
 * - UserProviderWrapper (skipped by AppShell for auth pages)
 * - AppShell (skipped for auth pages)
 * 
 * This layout just passes through children to avoid duplicate provider nesting.
 */

import * as React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Just return children - all providers come from root layout
  return <>{children}</>;
}
