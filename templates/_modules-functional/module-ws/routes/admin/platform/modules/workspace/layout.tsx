"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Layout for Workspace Module Admin Pages
 * 
 * Wraps pages in SessionProvider to enable useSession() hook.
 * This is required for Next.js App Router when using NextAuth.
 */
export default function WorkspaceAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
