import * as React from "react";
import type { Metadata } from "next";
import { AuthProvider, UserProviderWrapper } from "@{{PROJECT_NAME}}/module-access";
import OrgProviderWrapper from "../components/OrgProviderWrapper";
import ThemeRegistry from "../components/ThemeRegistry";
import AppShell from "../components/AppShell";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "CORA Eval Optimizer",
  description: "Evaluation prompt optimization workbench",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

/**
 * Root Layout for Eval Optimizer - Following ADR-007 CORA Auth Shell Standard
 * 
 * Provider hierarchy: AuthProvider → ThemeRegistry → UserProviderWrapper → OrgProviderWrapper → AppShell
 * 
 * This layout provides the full CORA shell with:
 * - AuthProvider for Okta/NextAuth session management
 * - UserProviderWrapper for user profile loading
 * - OrgProviderWrapper for organization context (required for optimization workspaces)
 * - AppShell with sidebar navigation and org selector
 * 
 * @see cora-dev-toolkit/docs/ADR-007-CORA-AUTH-SHELL-STANDARD.md
 * @see cora-dev-toolkit/docs/ADR-008-SIDEBAR-AND-ORG-SELECTOR-STANDARD.md
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" style={{ height: "100%" }}>
      <body style={{ margin: 0, height: "100%" }}>
        <AuthProvider session={session}>
          <ThemeRegistry>
            <UserProviderWrapper>
              <OrgProviderWrapper>
                <AppShell>{children}</AppShell>
              </OrgProviderWrapper>
            </UserProviderWrapper>
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}