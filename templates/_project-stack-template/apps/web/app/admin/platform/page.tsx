import React from "react";
import { Box, Grid, Card, CardContent, Typography, CardActionArea } from "@mui/material";
import Link from "next/link";
import { getPlatformAdminCards } from "@/lib/moduleRegistry";

/**
 * System Administration Page
 *
 * Displays admin cards for system-level administration.
 * Only accessible to sys_owner and sys_admin roles.
 */
export default function SystemAdminPage() {
  // Load platform admin cards from module registry
  const adminCards = getPlatformAdminCards();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Administration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage system-level configuration and settings
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
