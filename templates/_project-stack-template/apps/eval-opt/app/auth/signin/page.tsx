"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Box, Button, Typography, Alert } from "@mui/material";

/**
 * Sign In Page for Eval Optimizer
 *
 * Simple sign-in page that shows sign-in button and handles Okta redirect.
 * Does NOT use useSession to avoid SessionProvider dependency issues.
 * 
 * Note: This page doesn't check if user is already authenticated.
 * If authenticated users land here, the auth flow will redirect them appropriately.
 */
export default function SignInPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSignIn = () => {
    signIn("okta", { callbackUrl });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: 3,
        p: 3,
      }}
    >
      <Typography variant="h4" component="h1">
        Eval Optimizer - Sign In
      </Typography>

      {error && error !== "session_expired" && (
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          Authentication error: {error}
        </Alert>
      )}

      <Typography variant="body1" color="text.secondary">
        Please sign in to continue
      </Typography>

      <Button
        variant="contained"
        size="large"
        onClick={handleSignIn}
      >
        Sign In with Okta
      </Button>
    </Box>
  );
}
