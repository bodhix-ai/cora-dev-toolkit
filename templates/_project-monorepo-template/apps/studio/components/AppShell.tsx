"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
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
  const [focusMode, setFocusMode] = React.useState(false);

  // Keyboard shortcut for focus mode (Ctrl/Cmd+F)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+F (Windows/Linux) or Cmd+F (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        // Only toggle focus mode, don't prevent default browser find
        // We use a modifier check to distinguish from regular Cmd+F
        if (event.shiftKey) {
          event.preventDefault();
          setFocusMode(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      <Sidebar collapsed={focusMode} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: focusMode ? 1 : 3,
          overflow: "auto",
          transition: "padding 0.3s ease",
        }}
      >
        {/* Focus Mode Toggle Button */}
        <Tooltip 
          title={focusMode ? "Exit Focus Mode (Shift+Ctrl/Cmd+F)" : "Enter Focus Mode (Shift+Ctrl/Cmd+F)"}
          placement="left"
        >
          <IconButton
            onClick={() => setFocusMode(prev => !prev)}
            aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
            sx={{
              position: "fixed",
              top: 16,
              right: 16,
              backgroundColor: focusMode ? "primary.main" : "background.paper",
              color: focusMode ? "white" : "text.primary",
              zIndex: 1000,
              boxShadow: 2,
              "&:hover": {
                backgroundColor: focusMode ? "primary.dark" : "action.hover",
              },
            }}
          >
            {focusMode ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
        {children}
      </Box>
    </Box>
  );
}