"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { Box, Grid, Card, CardContent, Typography, CardActionArea, CircularProgress, Alert } from "@mui/material";
import Link from "next/link";
import { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";
import { getIcon } from "@/lib/iconMap";
import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";

interface SystemAdminClientPageProps {
  adminCards: AdminCardConfig[];
}

/**
 * @component SystemAdminClientPage
 * @description System Administration Client Page
 *
 * Follows the standard System Admin pattern (section 8.2.1):
 * - Uses authAdapter from useUser() to extract token
 * - Fetches modules from API using CORA authenticated client
 * - Transforms API response to admin card format
 *
 * @routes
 * - GET /admin/sys - System administration dashboard
 */
export default function SystemAdminClientPage({ adminCards: _unusedAdminCards }: SystemAdminClientPageProps) {
  // ✅ Standard pattern: useUser() provides loading, authAdapter, isAuthenticated
  const { loading, authAdapter, isAuthenticated } = useUser();
  
  // ✅ Standard pattern: useRole() provides isSysAdmin (NO loading here!)
  const { isSysAdmin } = useRole();
  
  // ✅ Standard pattern: Extract token for API calls
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  
  // Module data state
  const [modules, setModules] = useState<any[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ Standard pattern: Extract token from authAdapter
  useEffect(() => {
    if (!authAdapter || !isAuthenticated) {
      setToken(null);
      setTokenLoading(false);
      return;
    }
    authAdapter.getToken().then(setToken).finally(() => setTokenLoading(false));
  }, [authAdapter, isAuthenticated]);
  
  // Fetch modules from API once we have the token
  useEffect(() => {
    if (!token) return;
    
    const fetchModules = async () => {
      setModulesLoading(true);
      try {
        // ✅ Use CORA authenticated client with token
        const apiClient = createCoraAuthenticatedClient(token);
        const response = await apiClient.get<{ success: boolean; data: { modules: any[] } }>('/admin/sys/mgmt/modules');
        
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
  }, [token]);
  
  // Transform API modules to admin cards
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
          context: "platform",  // System admin cards use "platform" context
        };
      })
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [modules]);

  // ✅ Standard pattern: Check loading FIRST
  if (loading || tokenLoading || modulesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // ✅ Standard pattern: Then check authorization (sys admin only, no org context)
  if (!isSysAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. System administrator role required.
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
        System Administration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage system-level configuration and settings
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
