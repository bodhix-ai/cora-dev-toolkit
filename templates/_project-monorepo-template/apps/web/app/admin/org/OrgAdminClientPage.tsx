"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useUser, useRole, useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { useModuleEnabled } from "@{{PROJECT_NAME}}/module-mgmt";
import { Box, Grid, Card, CardContent, Typography, CardActionArea, CircularProgress, Alert } from "@mui/material";
import Link from "next/link";
import { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";
import { getIcon } from "@/lib/iconMap";
import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

interface OrgAdminClientPageProps {
  adminCards: AdminCardConfig[];
}

// Functional modules that can be toggled on/off
const FUNCTIONAL_MODULES = ['chat', 'eval', 'voice'];

/**
 * @component OrgAdminClientPage
 * @description Organization Administration Client Page
 *
 * Follows the standard Organization Admin pattern (section 8.2.2):
 * - Uses authAdapter from useUser() to extract token
 * - Fetches organization modules from API using CORA authenticated client
 * - Transforms API response to admin card format
 * - Filters based on module enabled state
 *
 * @routes
 * - GET /admin/org - Organization administration dashboard
 */
export default function OrgAdminClientPage({ adminCards: _unusedAdminCards }: OrgAdminClientPageProps) {
  // ✅ Standard pattern: useUser() provides loading, authAdapter, isAuthenticated
  const { loading, authAdapter, isAuthenticated } = useUser();
  
  // ✅ Standard pattern: useRole() provides isOrgAdmin (NO loading here!)
  const { isOrgAdmin } = useRole();
  
  // ✅ Organization context required for org-scoped routes
  const { currentOrganization } = useOrganizationContext();
  
  // ✅ Standard pattern: Extract token for API calls
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  
  // Module data state
  const [modules, setModules] = useState<any[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check runtime enabled state for functional modules
  const isChatEnabled = useModuleEnabled('module-chat');
  const isEvalEnabled = useModuleEnabled('module-eval');
  const isVoiceEnabled = useModuleEnabled('module-voice');
  
  // ✅ Standard pattern: Extract token from authAdapter
  useEffect(() => {
    if (!authAdapter || !isAuthenticated) {
      setToken(null);
      setTokenLoading(false);
      return;
    }
    authAdapter.getToken().then(setToken).finally(() => setTokenLoading(false));
  }, [authAdapter, isAuthenticated]);
  
  // Fetch modules from API once we have token and orgId
  useEffect(() => {
    if (!token || !currentOrganization) return;
    
    const fetchModules = async () => {
      setModulesLoading(true);
      try {
        // ✅ Use CORA authenticated client with token and orgId
        const apiClient = createCoraAuthenticatedClient(token);
        const response = await apiClient.get<{ success: boolean; data: { modules: any[] } }>(
          `/admin/org/mgmt/modules?orgId=${currentOrganization.orgId}`
        );
        
        if (response.success && response.data) {
          setModules(response.data.modules || []);
        } else {
          setError('Failed to load modules');
        }
      } catch (err) {
        console.error('Error fetching modules:', err);
        setError('Failed to load modules');
      } finally {
        setModulesLoading(false);
      }
    };
    
    fetchModules();
  }, [token, currentOrganization]);
  
  // Transform API modules to admin cards and filter by enabled state
  const visibleCards = useMemo(() => {
    return modules
      .filter((module) => module.isEnabled && module.navConfig?.adminOnly)
      .map((module): AdminCardConfig => {
        const moduleId = module.name.replace('module-', '');
        return {
          id: moduleId,
          href: module.navConfig.route,
          icon: getIcon(module.navConfig.icon),
          title: module.displayName,
          description: module.description,
          order: module.navConfig.order || 999,
          context: "organization",  // Organization admin cards use "organization" context
        };
      })
      .filter((card) => {
        // Core modules are always visible
        if (!FUNCTIONAL_MODULES.includes(card.id)) {
          return true;
        }
        
        // Functional modules respect runtime enabled state
        switch (card.id) {
          case 'chat':
            return isChatEnabled;
          case 'eval':
            return isEvalEnabled;
          case 'voice':
            return isVoiceEnabled;
          default:
            return true;
        }
      })
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [modules, isChatEnabled, isEvalEnabled, isVoiceEnabled]);

  // ✅ Standard pattern: Check loading FIRST
  if (loading || tokenLoading || modulesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // ✅ Standard pattern: Then check authorization (org admin only, requires org context)
  if (!isOrgAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. Organization administrator role required.
        </Alert>
      </Box>
    );
  }
  
  if (!currentOrganization) {
    return (
      <Box p={4}>
        <Alert severity="warning">
          Please select an organization to continue.
        </Alert>
      </Box>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Organization Administration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage organization-level configuration and settings
      </Typography>

      <Grid container spacing={3}>
        {visibleCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.id}>
            <Card>
              <Link href={card.href as any} style={{ textDecoration: "none", color: "inherit" }} aria-label={card.title}>
                <CardActionArea>
                  <CardContent sx={{ textAlign: "center", py: 4 }}>
                    <Box sx={{ color: card.color || "primary.main", mb: 2 }}>
                      {card.icon}
                    </Box>
                    <Typography variant="h5" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Link>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
