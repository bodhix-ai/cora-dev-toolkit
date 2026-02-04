"use client";

import React, { useMemo } from "react";
import { useUser, useRole, useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { useModuleEnabled } from "@{{PROJECT_NAME}}/module-mgmt";
import { Box, Grid, Card, CardContent, Typography, CardActionArea, CircularProgress, Alert } from "@mui/material";
import Link from "next/link";
import { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";

interface OrgAdminClientPageProps {
  adminCards: AdminCardConfig[];
}

// Functional modules that can be toggled on/off
const FUNCTIONAL_MODULES = ['chat', 'eval', 'voice'];

/**
 * Organization Administration Client Page
 *
 * Client component that handles authentication and displays admin cards.
 * Cards are passed from server component (loaded with fs access).
 * Functional module cards are filtered based on runtime module enabled state.
 */
export default function OrgAdminClientPage({ adminCards }: OrgAdminClientPageProps) {
  const { profile, loading, isAuthenticated } = useUser();
  const { isOrgAdmin } = useRole();
  const { orgId, organization } = useOrganizationContext();
  
  // Check runtime enabled state for functional modules
  const isChatEnabled = useModuleEnabled('module-chat');
  const isEvalEnabled = useModuleEnabled('module-eval');
  const isVoiceEnabled = useModuleEnabled('module-voice');
  
  // Filter admin cards based on module enabled state
  const visibleCards = useMemo(() => {
    return adminCards.filter((card) => {
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
    });
  }, [adminCards, isChatEnabled, isEvalEnabled, isVoiceEnabled]);

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

  // Authorization check - org admins only (revised ADR-016)
  // Sys admins needing access should add themselves to the org
  if (!isOrgAdmin) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Access denied. Organization administrator role required.
        </Alert>
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
