"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress, Container, Typography } from "@mui/material";

/**
 * Organizations List Parent Route (Client Component)
 * 
 * Required by Next.js routing for child routes like /admin/sys/access/orgs/[id]
 * Redirects to the access page which shows the organizations list.
 */
export default function OrgsListPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to parent access page which shows org list
    router.push("/admin/sys/access");
  }, [router]);

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