"use client";

import { useRouter } from "next/navigation";
import { useProfile } from "module-access";
import { Box, Typography, Button, Container, Paper } from "@mui/material";
import { Lock as LockIcon } from "@mui/icons-material";

export default function AccessDeniedPage() {
  const { profile, loading } = useProfile();
  const router = useRouter();

  // If user doesn't require invitation, redirect to dashboard
  if (!loading && profile && !profile.requiresInvitation) {
    router.push("/");
    return null;
  }

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            textAlign: "center",
          }}
        >
          <Typography variant="body1">Loading...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            maxWidth: 500,
          }}
        >
          <LockIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />

          <Typography variant="h4" gutterBottom>
            Access Request Pending
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 3 }}>
            Your email address <strong>{profile?.email}</strong> is not associated
            with an invitation or authorized email domain.
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Please contact your system administrator to receive an invitation
            to join an organization.
          </Typography>

          <Button
            variant="contained"
            href="mailto:support@example.com?subject=Access Request"
            sx={{ mt: 2 }}
          >
            Contact Support
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}
