"use client";

import React from "react";
import { Box, CircularProgress, Alert, Typography } from "@mui/material";
import { useUser, useRole, useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { OrgDetails } from "./OrgDetails";

/**
 * Organization Access Admin Component
 *
 * Provides organization administrators with a tabbed interface for managing
 * their organization, including:
 * - Overview: Basic organization information
 * - Domains: Email domain management
 * - Members: Organization membership and role management
 * - Invites: Pending invitation management
 *
 * Follows the Organization Admin Pattern (01_std_front_ADMIN-ARCH.md §8.2.2):
 * - useUser() for loading + authAdapter
 * - useRole() for isOrgAdmin authorization (NO isSysAdmin - ADR-016)
 * - useOrganizationContext() for currentOrganization
 *
 * @component OrgAccessAdmin
 * @routes
 * - GET /orgs/{orgId} - Get organization details
 * - GET /admin/org/access/users - List organization members
 * - PUT /admin/org/access/users/{userId} - Update member role
 * - DELETE /admin/org/access/users/{userId} - Remove member
 * - GET /admin/org/access/domains - List organization domains
 * - POST /admin/org/access/domains - Add domain
 * - DELETE /admin/org/access/domains/{domainId} - Remove domain
 * - GET /admin/org/access/invites - List pending invitations
 * - POST /admin/org/access/invites - Create invitation
 * - DELETE /admin/org/access/invites/{inviteId} - Cancel invitation
 */
export function OrgAccessAdmin() {
  // ✅ useUser() provides: loading, authAdapter (CoraAuthAdapter type)
  const { loading, authAdapter } = useUser();

  // ✅ useRole() provides: isOrgAdmin (NO loading here!)
  const { isOrgAdmin } = useRole();

  // ✅ useOrganizationContext() provides: currentOrganization
  const { currentOrganization } = useOrganizationContext();

  // ✅ Check loading FIRST (from useUser, NOT useRole)
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress aria-label="Loading organization access administration" />
      </Box>
    );
  }

  // ✅ Then check authorization - org admins only (no sys admin inheritance per ADR-016)
  if (!isOrgAdmin) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          <Typography>
            Access denied. Organization administrator role required.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // ✅ Then check organization context
  if (!currentOrganization) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">
          <Typography>
            No organization selected. Please select an organization to manage.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // ✅ Pass authAdapter AND orgId to OrgDetails, isSysAdmin always false for org admin pages
  return (
    <OrgDetails
      orgId={currentOrganization.orgId}
      authAdapter={authAdapter}
      isSysAdmin={false}
    />
  );
}