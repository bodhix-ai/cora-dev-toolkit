"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Link from "next/link";
import { useUser } from "@{{PROJECT_NAME}}/module-access";

/**
 * Landing Page for Eval Optimizer
 * 
 * Purpose: Entry point for the evaluation optimization workbench.
 * Uses module-access for authentication state.
 */
export default function HomePage() {
  const { profile, isAuthenticated, loading } = useUser();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>CORA Eval Optimizer</Typography>
        <Alert severity="info">Please sign in to continue.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        CORA Eval Optimizer
      </Typography>
      <Typography variant="body1" gutterBottom>
        Welcome, {profile?.name || profile?.email}!
      </Typography>
      
      <Paper sx={{ mt: 3, p: 2, bgcolor: "grey.100" }}>
        <Typography variant="h5" gutterBottom>Evaluation Optimization Workbench</Typography>
        <Typography variant="body2" gutterBottom>
          This workbench enables business analysts to optimize prompt configurations
          for document evaluation using sample-driven training.
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li>Upload sample documents with truth keys</li>
          <li>Configure response structures</li>
          <li>Run automated optimization</li>
          <li>Compare results and deploy best configurations</li>
        </Typography>
      </Paper>

      <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
        <Button
          component={Link}
          href="/ws"
          variant="contained"
          color="primary"
        >
          View Workspaces
        </Button>
        <Button
          component={Link}
          href="/optimizer"
          variant="outlined"
        >
          Sprint 1 Prototype
        </Button>
      </Box>
    </Box>
  );
}