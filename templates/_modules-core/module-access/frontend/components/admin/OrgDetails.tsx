"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  AlertTitle,
} from "@mui/material";
import { NavigateNext } from "@mui/icons-material";
import { CoraAuthAdapter, createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
import { useRouter } from "next/navigation";
import { OrgDetailsTab } from "./OrgDetailsTab";
import { OrgDomainsTab } from "./OrgDomainsTab";
import { OrgMembersTab } from "./OrgMembersTab";
import { OrgInvitesTab } from "./OrgInvitesTab";
import { OrgAIConfigTab } from "./OrgAIConfigTab";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`org-tabpanel-${index}`}
      aria-labelledby={`org-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  allowedDomain?: string;
  domain_defaultRole?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrgDetailsProps {
  orgId: string;
  authAdapter: CoraAuthAdapter;
  isSysAdmin: boolean;
}

/**
 * Organization Details Component
 * 
 * Displays detailed information about an organization with tabs for:
 * - Overview: Basic organization info
 * - Domains: Email domain management
 * - Members: Organization membership
 * - Invites: Pending invitations
 * - AI Config: AI configuration (platform admins only)
 */
export function OrgDetails({ orgId, authAdapter, isSysAdmin }: OrgDetailsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganization();
  }, [orgId]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await authAdapter.getToken();
      if (!token) {
        setError("Authentication required");
        return;
      }
      const apiClient = createCoraAuthenticatedClient(token);
      const response = await apiClient.get<{ success: boolean; data: Organization }>(`/orgs/${orgId}`);
      if (response.success) {
        setOrganization(response.data);
      } else {
        setError("Failed to load organization");
      }
    } catch (err) {
      setError("Failed to load organization");
      console.error("Error fetching organization:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !organization) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error || "Organization not found"}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Breadcrumbs - context-aware for sys admin vs org admin */}
      <Breadcrumbs
        separator={<NavigateNext fontSize="small" />}
        sx={{ mb: 2 }}
      >
        <Link
          color="inherit"
          href={isSysAdmin ? "/admin/sys" : "/admin/org"}
          sx={{ cursor: "pointer" }}
          aria-label={isSysAdmin ? "Go to Sys Admin" : "Go to Org Admin"}
        >
          {isSysAdmin ? "Sys Admin" : "Org Admin"}
        </Link>
        <Link
          color="inherit"
          href={isSysAdmin ? "/admin/sys/access" : "/admin/org/access"}
          onClick={(e) => {
            e.preventDefault();
            router.push(isSysAdmin ? "/admin/sys/access" : "/admin/org/access");
          }}
          sx={{ cursor: "pointer" }}
          aria-label="Back to Access Control"
        >
          Access
        </Link>
        <Typography color="text.primary">{organization.name}</Typography>
      </Breadcrumbs>

      {/* Organization Header */}
      <Typography variant="h4" gutterBottom>
        {organization.name}
      </Typography>
      {organization.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {organization.description}
        </Typography>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Organization details tabs"
        >
          <Tab label="Overview" id="org-tab-0" aria-controls="org-tabpanel-0" />
          <Tab label="Domains" id="org-tab-1" aria-controls="org-tabpanel-1" />
          <Tab label="Members" id="org-tab-2" aria-controls="org-tabpanel-2" />
          <Tab label="Invites" id="org-tab-3" aria-controls="org-tabpanel-3" />
          {isSysAdmin && (
            <Tab label="AI Config" id="org-tab-4" aria-controls="org-tabpanel-4" />
          )}
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <OrgDetailsTab 
          orgId={orgId} 
          authAdapter={authAdapter}
          onUpdate={fetchOrganization}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <OrgDomainsTab orgId={orgId} authAdapter={authAdapter} />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <OrgMembersTab orgId={orgId} authAdapter={authAdapter} />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <OrgInvitesTab orgId={orgId} authAdapter={authAdapter} />
      </TabPanel>

      {isSysAdmin && (
        <TabPanel value={activeTab} index={4}>
          <OrgAIConfigTab orgId={orgId} authAdapter={authAdapter} />
        </TabPanel>
      )}
    </Box>
  );
}
