"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import LockIcon from "@mui/icons-material/Lock";
import Button from "@mui/material/Button";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { Sidebar } from "./Sidebar";
import type { NavigationConfig } from "@{{PROJECT_NAME}}/shared-types";

/**
 * AppShell Component - Following ADR-007 & ADR-008 CORA Standards
 * 
 * Handles conditional UI rendering based on auth state:
 * - Auth pages: No shell (just children)
 * - Loading: Full-screen loading spinner
 * - Access denied: In-place access denied UI (no redirect)
 * - Authenticated: Full app shell with sidebar
 * 
 * Key principles:
 * - NO REDIRECTS in this component (middleware handles auth redirects)
 * - Uses CORA context ONLY (no Zustand for user/org state)
 * - Integrates Sidebar with OrganizationSwitcher (ADR-008 pattern)
 * 
 * CRITICAL FIX: Split into two components to avoid calling useProfile() on auth pages.
 * Calling hooks unconditionally before checking pathname causes rendering errors
 * (ERR_INCOMPLETE_CHUNKED_ENCODING) when the UserContext isn't available yet.
 * 
 * @see cora-dev-toolkit/docs/ADR-007-CORA-AUTH-SHELL-STANDARD.md
 * @see cora-dev-toolkit/docs/ADR-008-SIDEBAR-AND-ORG-SELECTOR-STANDARD.md
 */
interface AppShellProps {
  children: React.ReactNode;
  navigation: NavigationConfig;
}

export default function AppShell({ children, navigation }: AppShellProps) {
  const pathname = usePathname();

  // Auth pages don't need the shell - return BEFORE calling any hooks
  // By returning early BEFORE calling useProfile(), we avoid accessing UserContext
  // on auth pages where the user might not be authenticated yet
  const isAuthPage = pathname.startsWith("/auth/") || 
                     pathname.startsWith("/sign-") ||
                     pathname === "/access-denied";
  
  if (isAuthPage) {
    return <>{children}</>;
  }

  // For non-auth pages, use the full AppShell with profile checks
  return <AppShellWithProfile navigation={navigation}>{children}</AppShellWithProfile>;
}

/**
 * AppShellWithProfile - The actual app shell that requires authentication
 * 
 * This component is only rendered for non-auth pages, so it's safe to call useProfile()
 */
function AppShellWithProfile({ 
  children, 
  navigation 
}: { 
  children: React.ReactNode;
  navigation: NavigationConfig;
}) {
  const { profile, loading, isAuthenticated } = useUser();

  // Show loading while auth state is being determined
  // Only for authenticated users - if not authenticated, let page handle it
  if (loading && isAuthenticated) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading your session...
        </Typography>
      </Box>
    );
  }

  // Show access denied in-place if user requires invitation
  // This is conditional UI rendering, NOT a redirect (per ADR-007)
  if (profile?.requiresInvitation) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
          p: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            maxWidth: 500,
          }}
        >
          <LockIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          
          <Typography variant="h4" gutterBottom>
            Access Request Pending
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 3 }}>
            Your email address <strong>{profile?.email}</strong> is not associated 
            with an invitation or authorized email domain.
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Please contact your system administrator to receive an invitation 
            to join an organization.
          </Typography>
          
          <Button
            variant="contained"
            href="mailto:support@example.com?subject=Access Request"
            sx={{ mt: 2 }}
          >
            Contact Support
          </Button>
        </Paper>
      </Box>
    );
  }

  // If not authenticated, render children without shell
  // The page (e.g., home page) will handle the unauthenticated state (show sign-in prompt)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Normal authenticated user - show full app shell with sidebar
  // Following ADR-008: Sidebar with OrganizationSwitcher at bottom
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar navigation={navigation} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          overflow: "auto",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
