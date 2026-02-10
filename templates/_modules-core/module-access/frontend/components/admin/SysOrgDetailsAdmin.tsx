"use client";

import React from "react";
import { Box, CircularProgress, Alert, Typography } from "@mui/material";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { OrgDetails } from "./OrgDetails";

/**
 * System Admin Organization Details Component
 *
 * Provides system administrators with a tabbed interface for managing
 * any organization, including:
 * - Overview: Basic organization information
 * - Domains: Email domain management
 * - Members: Organization membership and role management
 * - Invites: Pending invitation management
 * - AI Config: AI provider configuration (sys admin only)
 *
 * Follows the System Admin Pattern (01_std_front_ADMIN-ARCH.md §8.2.1):
 * - useUser() for loading + authAdapter
 * - useRole() for isSysAdmin authorization
 * - No organization context needed (sys admin has platform-wide access)
 *
 * @component SysOrgDetailsAdmin
 * @routes
 * - GET /orgs/{orgId} - Get organization details
 * - GET /admin/sys/access/orgs/{orgId}/users - List organization members
 * - PUT /admin/sys/access/orgs/{orgId}/users/{userId} - Update member role
 * - DELETE /admin/sys/access/orgs/{orgId}/users/{userId} - Remove member
 * - GET /admin/sys/access/orgs/{orgId}/domains - List organization domains
 * - POST /admin/sys/access/orgs/{orgId}/domains - Add domain
 * - DELETE /admin/sys/access/orgs/{orgId}/domains/{domainId} - Remove domain
 * - GET /admin/sys/access/orgs/{orgId}/invites - List pending invitations
 * - POST /admin/sys/access/orgs/{orgId}/invites - Create invitation
 * - DELETE /admin/sys/access/orgs/{orgId}/invites/{inviteId} - Cancel invitation
 * - GET /admin/sys/access/orgs/{orgId}/ai-config - Get AI configuration
 * - PUT /admin/sys/access/orgs/{orgId}/ai-config - Update AI configuration
 */

interface SysOrgDetailsAdminProps {
  orgId: string;
}

export function SysOrgDetailsAdmin({ orgId }: SysOrgDetailsAdminProps) {
  // ✅ useUser() provides: loading, authAdapter (CoraAuthAdapter type)
  const { loading, authAdapter } = useUser();

  // ✅ useRole() provides: isSysAdmin (NO loading here!)
  const { isSysAdmin } = useRole();

  // ✅ Check loading FIRST (from useUser, NOT useRole)
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress aria-label="Loading organization details" />
      </Box>
    );
  }

  // ✅ Then check authorization - sys admins only (no org context needed)
  if (!isSysAdmin) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          <Typography>
            Access denied. System administrator role required.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // ✅ Pass authAdapter AND orgId, isSysAdmin=true for sys admin pages
  return (
    <OrgDetails
      orgId={orgId}
      authAdapter={authAdapter}
      isSysAdmin={true}
    />
  );
}