"use client";

import React from "react";
import { Box, Grid, Card, CardContent, Typography, CardActionArea } from "@mui/material";
import { useRouter } from "next/navigation";
import { accessControlAdminCard } from "@{{PROJECT_NAME}}/module-access";
import { aiEnablementAdminCard } from "@{{PROJECT_NAME}}/module-ai";
import { platformMgmtAdminCard } from "@{{PROJECT_NAME}}/module-mgmt";

/**
 * Platform Administration Page
 * 
 * Displays admin cards from all enabled modules.
 * Each module exports an admin card that links to its admin page.
 * 
 * Only accessible to platform_owner and platform_admin roles.
 */
export default function PlatformAdminPage() {
  const router = useRouter();
  
  // Collect all admin cards from modules
  const adminCards = [
    accessControlAdminCard,
    aiEnablementAdminCard,
    platformMgmtAdminCard,
  ].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Platform Administration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage platform-level configuration and settings
      </Typography>
      
      <Grid container spacing={3}>
        {adminCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.id}>
            <Card>
              <CardActionArea onClick={() => router.push(card.href)}>
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
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
