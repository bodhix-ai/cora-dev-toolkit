"use client";

import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { OrgDetails } from "@{{PROJECT_NAME}}/module-access";
import { CircularProgress, Box, Alert } from "@mui/material";

/**
 * Organization Details Page
 * 
 * Displays detailed information about a specific organization with tabs for:
 * - Overview: Basic organization information
 * - Domains: Email domain management
 * - Members: Organization membership
 * - Invites: Pending invitations
 * - AI Config: AI configuration (system admins only)
 * 
 * Accessible to:
 * - System admins (all tabs)
 * - Org owners/admins (Overview, Domains, Members, Invites only)
 */
export default function OrgDetailsPage({ params }: { params: { id: string } }) {
  const { profile, loading, isAuthenticated, authAdapter } = useUser();
  const { isSysAdmin, isOrgAdmin } = useRole();

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Box p={4}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // Authorization check - system admins OR org admins
  if (!isSysAdmin && !isOrgAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. System administrator or organization administrator role required.
        </Alert>
      </Box>
    );
  }

  return (
    <OrgDetails
      orgId={params.id}
      authAdapter={authAdapter}
      isSysAdmin={isSysAdmin}
    />
  );
}
