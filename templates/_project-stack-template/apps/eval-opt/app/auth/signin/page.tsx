"use client";

import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Box, Button, Typography, Alert, CircularProgress } from "@mui/material";
import { useEffect } from "react";

/**
 * Sign In Page for Eval Optimizer
 *
 * Simplified sign-in page that uses NextAuth's useSession directly.
 * Checks if user is already authenticated and redirects if so.
 * Otherwise shows sign-in button and handles Okta redirect.
 */
export default function SignInPage() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isSignedIn = status === "authenticated";
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Redirect authenticated users away from signin page
  useEffect(() => {
    if (isSignedIn) {
      console.log("[SIGNIN PAGE] User already authenticated, redirecting to:", callbackUrl);
      window.location.href = callbackUrl;
    }
  }, [isSignedIn, callbackUrl]);

  const handleSignIn = () => {
    signIn("okta", { callbackUrl });
  };

  // Show loading while checking session
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // Show loading while redirecting authenticated user
  if (isSignedIn) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Redirecting...
        </Typography>
      </Box>
    );
  }

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