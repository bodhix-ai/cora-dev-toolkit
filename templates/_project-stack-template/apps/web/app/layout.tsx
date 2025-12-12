import * as React from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import ThemeRegistry from "../components/ThemeRegistry";
import AppShell from "../components/AppShell";
import ClientProviders from "../components/ClientProviders";

export const metadata: Metadata = {
  title: "${project_display_name}",
  description: "AI-driven policy workspace",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body style={{ margin: 0, height: "100%" }}>
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        >
          <ThemeRegistry>
            {/* Phase 1: Client-side providers (SessionProvider, OrgProvider, OrgStateSyncProvider) */}
            <ClientProviders>
              <AppShell>{children}</AppShell>
            </ClientProviders>
          </ThemeRegistry>
        </ClerkProvider>
      </body>
    </html>
  );
}
