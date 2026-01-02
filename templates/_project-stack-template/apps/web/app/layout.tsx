import * as React from "react";
import type { Metadata } from "next";
import { AuthProvider, UserProviderWrapper } from "@{{PROJECT_NAME}}/module-access";
import OrgProviderWrapper from "../components/OrgProviderWrapper";
import ThemeRegistry from "../components/ThemeRegistry";
import AppShell from "../components/AppShell";
import { auth } from "@/auth";
import { buildNavigationConfig } from "@/lib/moduleRegistry";

export const metadata: Metadata = {
  title: "{{PROJECT_DISPLAY_NAME}}",
  description: "AI-driven workspace",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

/**
 * Root Layout - Following ADR-007 CORA Auth Shell Standard
 * 
 * Provider hierarchy: AuthProvider → ThemeRegistry → UserProviderWrapper → OrgProviderWrapper → AppShell
 * 
 * Key principles (per industry standards):
 * - Single root layout for ALL pages (no route groups for auth separation)
 * - AuthProvider wraps SessionProvider (Okta/NextAuth)
 * - UserProviderWrapper loads user profile from API
 * - OrgProviderWrapper creates auth adapter and wraps OrgProvider
 * - AppShell handles conditional UI rendering (loading states, access denied)
 * - NO AuthRouter component - middleware handles all auth redirects
 * 
 * **Auth Regression Fix:**
 * OrgProviderWrapper now provides the required authAdapter to OrgProvider,
 * fixing the regression where navigation menu and admin cards disappeared.
 * 
 * @see cora-dev-toolkit/docs/ADR-007-CORA-AUTH-SHELL-STANDARD.md
 * @see cora-dev-toolkit/docs/arch decisions/ADR-010-COGNITO-EXTERNAL-IDP-STRATEGY.md
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // Load navigation from module registry
  // This reads the merged cora-modules.config.yaml and builds navigation dynamically
  const navigation = buildNavigationConfig();

  return (
    <html lang="en" style={{ height: "100%" }}>
      <body style={{ margin: 0, height: "100%" }}>
        <AuthProvider session={session}>
          <ThemeRegistry>
            <UserProviderWrapper>
              <OrgProviderWrapper>
                <AppShell navigation={navigation}>{children}</AppShell>
              </OrgProviderWrapper>
            </UserProviderWrapper>
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}
