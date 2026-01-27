"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress, Container, Typography } from "@mui/material";
import { useUser } from "@{{PROJECT_NAME}}/module-access";

/**
 * Admin Parent Route (Client Component)
 * 
 * Required by Next.js routing but not directly accessed by users.
 * Users navigate to /admin/org or /admin/sys via navigation menu items.
 * 
 * This page redirects to the appropriate admin section based on user permissions:
 * - System admins → /admin/sys
 * - Organization admins → /admin/org
 */
export default function AdminPage() {
  const router = useRouter();
  const { profile, loading, isAuthenticated } = useUser();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !profile) {
      // Not authenticated, redirect to home
      router.push("/");
      return;
    }

    // Check user roles
    const isSysAdmin = ["sys_owner", "sys_admin"].includes(profile.sysRole || "");
    const isOrgAdmin = profile.organizations?.some(
      (org) => ["org_owner", "org_admin"].includes(org.role || "")
    );

    // If user has only one role, redirect accordingly
    if (isSysAdmin && !isOrgAdmin) {
      router.push("/admin/sys");
    } else if (isOrgAdmin && !isSysAdmin) {
      router.push("/admin/org");
    }
    // If user has both roles, show selection page (no redirect)
  }, [profile, loading, isAuthenticated, router]);

  // Check user roles for display
  const isSysAdmin = ["sys_owner", "sys_admin"].includes(profile?.sysRole || "");
  const isOrgAdmin = profile?.organizations?.some(
    (org) => ["org_owner", "org_admin"].includes(org.role || "")
  );

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      </Container>
    );
  }

  // User has both roles - show selection page
  if (isSysAdmin && isOrgAdmin) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Select Admin Section
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Choose which admin dashboard to access
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box
            component="a"
            href="/admin/org"
            sx={{
              p: 3,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              textDecoration: "none",
              color: "inherit",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Typography variant="h5" gutterBottom>
              Organization Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your organization's settings and members
            </Typography>
          </Box>
          <Box
            component="a"
            href="/admin/sys"
            sx={{
              p: 3,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              textDecoration: "none",
              color: "inherit",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Typography variant="h5" gutterBottom>
              System Admin
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Platform-wide system administration
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  // Fallback: redirecting message (shouldn't normally reach here)
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary">
          Redirecting...
        </Typography>
      </Box>
    </Container>
  );
}