import * as React from "react";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "CORA Eval Optimizer",
  description: "Evaluation prompt optimization workbench",
};

/**
 * Root Layout for Eval Optimizer - Sprint 1 Prototype
 * 
 * CRITICAL: This is a MINIMAL prototype to prove Option A (Same Stack Repo) works.
 * 
 * Key Features Demonstrated:
 * - Shared auth with main app (same Okta/Cognito provider)
 * - SessionProvider for NextAuth integration
 * - Simplified layout (no AppShell/OrgProvider complexity)
 * 
 * Future Enhancements (Sprint 2+):
 * - Full provider hierarchy (UserProvider, ThemeRegistry, etc.)
 * - Navigation and app shell
 * - Organization context
 * 
 * @see Sprint 1 Plan: docs/plans/plan_eval-optimization-s1.md
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}