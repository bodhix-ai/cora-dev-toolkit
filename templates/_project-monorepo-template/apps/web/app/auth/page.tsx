"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Box, Container, Typography, CircularProgress, Alert } from "@mui/material";

/**
 * Auth Parent Route (Client Component)
 * 
 * Required by Next.js routing for child routes like /auth/signin.
 * 
 * Handles session expiration and auth state cleanup:
 * - Catches users with expired/stale tokens
 * - Clears auth state by calling signOut
 * - Redirects to /auth/signin cleanly
 * 
 * This helps prevent redirect loops when tokens expire on non-homepage pages.
 */
export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear any stale auth state
    signOut({ redirect: false }).then(() => {
      // Redirect to signin after cleanup
      router.push("/auth/signin");
    });
  }, [router]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Session Expired
        </Alert>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary">
          Cleaning up session and redirecting to sign in...
        </Typography>
      </Box>
    </Container>
  );
}