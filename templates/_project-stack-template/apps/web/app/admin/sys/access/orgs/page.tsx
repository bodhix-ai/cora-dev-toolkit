"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress, Container, Typography } from "@mui/material";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";

/**
 * Organizations List Parent Route (Client Component)
 * 
 * Required by Next.js routing for child routes like /admin/sys/access/orgs/[id]
 * Redirects to the access page which shows the organizations list.
 */
export default function OrgsListPage() {
  const router = useRouter();
  const { profile, loading, isAuthenticated } = useUser();
  const { isSysAdmin } = useRole();

  useEffect(() => {
    if (loading) return;
    
    if (isAuthenticated && profile) {
      // Redirect to parent access page which shows org list
      router.push("/admin/sys/access");
    }
  }, [router, loading, isAuthenticated, profile]);

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Authentication check
  if (!isAuthenticated || !profile) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Typography variant="body1" color="text.secondary">
            Redirecting to login...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary">
          Redirecting...
        </Typography>
      </Box>
    </Container>
  );
}
