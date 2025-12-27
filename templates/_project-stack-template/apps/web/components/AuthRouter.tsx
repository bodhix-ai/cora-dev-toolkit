"use client";

import { ReactNode } from "react";
import { useProfile } from "@{{PROJECT_NAME}}/module-access";
import { redirect } from "next/navigation";
import { usePathname } from "next/navigation";
import { Box, CircularProgress, Typography } from "@mui/material";

/**
 * AuthRouter Component - Handles routing based on user provisioning scenario
 * 
 * IMPORTANT: Uses conditional rendering, NOT useEffect+router.push()
 * Using useEffect with router.push() causes infinite re-render loops because:
 * 1. router.push() triggers navigation
 * 2. Navigation causes component re-mount
 * 3. useEffect runs again with same conditions
 * 4. Loop continues
 * 
 * This component uses Next.js redirect() and conditional early returns instead,
 * which runs during the render phase and doesn't cause loops.
 * 
 * Scenarios handled:
 * 1. Standard Authorization - Returning users (normal flow)
 * 2. Invited User - Auto-assigned to org (normal flow)
 * 3. Domain User - Auto-assigned via email domain (normal flow)
 * 4. Bootstrap - Platform owner redirected to /admin/organization
 * 5. Denied Access - Redirected to /access-denied
 */
export function AuthRouter({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile();
  const pathname = usePathname();

  // Don't apply routing logic to auth pages - they handle their own flow
  if (pathname.startsWith("/auth/")) {
    return <>{children}</>;
  }

  // Don't apply routing logic to access-denied page to prevent loops
  if (pathname.startsWith("/access-denied")) {
    return <>{children}</>;
  }

  // Show loading while profile is being fetched
  if (loading) {
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
          Loading your profile...
        </Typography>
      </Box>
    );
  }

  // No profile yet - still loading or error
  if (!profile) {
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
          Setting up your account...
        </Typography>
      </Box>
    );
  }

  // SCENARIO 5: Denied Access - user requires invitation
  // Use redirect() from next/navigation (runs during render, not in useEffect)
  if (profile.requiresInvitation) {
    redirect("/access-denied");
  }

  // SCENARIO 4: Bootstrap - platform owner on home page should go to org settings
  if (profile.globalRole === "platform_owner") {
    // Only redirect from root path, not from admin pages
    if (pathname === "/" && !pathname.startsWith("/admin")) {
      redirect("/admin/organization");
    }
  }

  // SCENARIOS 1-3: Normal users with org context - render children
  // This handles:
  // - Standard Authorization (returning users)
  // - Invited User (auto-assigned to org)
  // - Domain User (auto-assigned via email domain)
  return <>{children}</>;
}
