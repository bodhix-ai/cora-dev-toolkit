import * as React from "react";
import type { Metadata } from "next";
import { AuthProvider, UserProviderWrapper, OrgProvider } from "@{{PROJECT_NAME}}/module-access";
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
 * Provider hierarchy: AuthProvider → ThemeRegistry → UserProviderWrapper → OrgProvider → AppShell
 * 
 * Key principles (per industry standards):
 * - Single root layout for ALL pages (no route groups for auth separation)
 * - AuthProvider wraps SessionProvider (Okta) or ClerkProvider (Clerk)
 * - UserProviderWrapper loads user profile from API
 * - OrgProvider loads organization context for the current user
 * - AppShell handles conditional UI rendering (loading states, access denied)
 * - NO AuthRouter component - middleware handles all auth redirects
 * 
 * @see cora-dev-toolkit/docs/ADR-007-CORA-AUTH-SHELL-STANDARD.md
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
              <OrgProvider>
                <AppShell navigation={navigation}>{children}</AppShell>
              </OrgProvider>
            </UserProviderWrapper>
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}
