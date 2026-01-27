"use client";

import React, { useState } from "react";
import { Box, Typography, Tabs, Tab, Alert, CircularProgress } from "@mui/material";
import {
  useUser,
  useCurrentOrg,
  createOktaAuthAdapter,
  OrgMembersTab,
  OrgInvitesTab,
} from "@{{PROJECT_NAME}}/module-access";

/**
 * Organization Access Management Page
 *
 * Organization-level access management page accessible to org admins and owners.
 * Provides tabs for:
 * - Members: Manage organization members
 * - Invites: View and manage pending invitations
 *
 * Access: org_owner, org_admin, sys_owner, sys_admin
 */
export default function OrgAccessPage() {
  const { profile, loading: userLoading, isAuthenticated } = useUser();
  const { currentOrg, loading: orgLoading } = useCurrentOrg();
  const [activeTab, setActiveTab] = useState(0);

  // Show loading state
  if (userLoading || orgLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Check authentication
  if (!isAuthenticated || !profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // Check if user has current organization
  if (!currentOrg) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          No organization selected. Please select an organization to continue.
        </Alert>
      </Box>
    );
  }

  // Check if user has admin access
  const isSysAdmin = ["sys_owner", "sys_admin"].includes(
    profile.sysRole || ""
  );
  const isOrgAdmin = ["org_owner", "org_admin"].includes(
    currentOrg.role || ""
  );

  if (!isSysAdmin && !isOrgAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to organization administrators.
        </Alert>
      </Box>
    );
  }

  // Create auth adapter
  const authAdapter = createOktaAuthAdapter();

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Access Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage members and invitations for {currentOrg.orgName}
      </Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Members" />
        <Tab label="Invites" />
      </Tabs>

      {activeTab === 0 && currentOrg.orgId && (
        <OrgMembersTab orgId={currentOrg.orgId} authAdapter={authAdapter} />
      )}
      
      {activeTab === 1 && currentOrg.orgId && (
        <OrgInvitesTab orgId={currentOrg.orgId} authAdapter={authAdapter} />
      )}
    </Box>
  );
}