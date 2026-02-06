"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { Sidebar } from "./Sidebar";

/**
 * AppShell Component for Eval Optimizer
 * 
 * Simplified app shell following ADR-007 & ADR-008 CORA Standards.
 * Handles conditional UI rendering based on auth state.
 * 
 * @see cora-dev-toolkit/docs/ADR-007-CORA-AUTH-SHELL-STANDARD.md
 * @see cora-dev-toolkit/docs/ADR-008-SIDEBAR-AND-ORG-SELECTOR-STANDARD.md
 */
interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Auth pages don't need the shell
  const isAuthPage = pathname.startsWith("/auth/") || 
                     pathname.startsWith("/sign-") ||
                     pathname === "/access-denied";
  
  if (isAuthPage) {
    return <>{children}</>;
  }

  // For non-auth pages, use the full AppShell with profile checks
  return <AppShellWithProfile children={children} />;
}

/**
 * AppShellWithProfile - The actual app shell that requires authentication
 */
function AppShellWithProfile({ children }: { children: React.ReactNode }) {
  const { profile, loading, isAuthenticated } = useUser();

  // Show loading while auth state is being determined
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

  // If not authenticated, render children without shell
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Normal authenticated user - show full app shell with sidebar
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar />
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