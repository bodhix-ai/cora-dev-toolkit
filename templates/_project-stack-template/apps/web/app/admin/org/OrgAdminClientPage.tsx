"use client";

import React from "react";
import { useUser } from "@{{PROJECT_NAME}}/module-access";
import { Box, Grid, Card, CardContent, Typography, CardActionArea, CircularProgress, Alert } from "@mui/material";
import Link from "next/link";
import { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";

interface OrgAdminClientPageProps {
  adminCards: AdminCardConfig[];
}

/**
 * Organization Administration Client Page
 *
 * Client component that handles authentication and displays admin cards.
 * Cards are passed from server component (loaded with fs access).
 */
export default function OrgAdminClientPage({ adminCards }: OrgAdminClientPageProps) {
  const { profile, loading, isAuthenticated } = useUser();

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

  // Authorization check (org admin only)
  const isOrgAdmin = ['org_owner', 'org_admin'].includes(profile.orgRole || '');
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
        {adminCards.map((card) => (
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
