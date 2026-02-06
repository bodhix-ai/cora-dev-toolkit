"use client";

/**
 * System Admin - Module Configuration Page
 *
 * Allows system administrators to:
 * - View all registered modules
 * - Enable/disable modules platform-wide
 * - Configure module settings and feature flags
 * - View module dependencies
 *
 * Access: System admins only (sys_owner, sys_admin)
 *
 * @example
 * Route: /admin/sys/mgmt/modules
 */

import React, { useState, useEffect } from "react";
import { useUser, useRole } from "@{{PROJECT_NAME}}/module-access";
import { createAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Switch,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  Info as InfoIcon,
  Settings as SettingsIcon,
  CheckCircle as EnabledIcon,
  Cancel as DisabledIcon,
} from "@mui/icons-material";

interface Module {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: "core" | "functional";
  tier?: number;
  isEnabled: boolean;
  isInstalled: boolean;
  version?: string;
  config?: Record<string, any>;
  featureFlags?: Record<string, any>;
  dependencies?: string[];
}

/**
 * System Module Configuration Component
 *
 * Main UI for managing module configuration at system level.
 */
export default function SystemModuleConfigPage() {
  const { profile, loading: authLoading, isAuthenticated } = useUser();
  const { isSysAdmin } = useRole();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch modules on mount
  useEffect(() => {
    if (isSysAdmin) {
      fetchModules();
    }
  }, [isSysAdmin]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      setError(null);

      const client = createAuthenticatedClient();
      const data = await client.get("/admin/sys/mgmt/modules");
      setModules(data.modules || []);
    } catch (err) {
      console.error("Error fetching modules:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch modules");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (module: Module) => {
    try {
      const endpoint = module.isEnabled
        ? `/admin/sys/mgmt/modules/${module.name}/disable`
        : `/admin/sys/mgmt/modules/${module.name}/enable`;

      const client = createAuthenticatedClient();
      await client.post(endpoint, {});

      // Refresh modules list
      await fetchModules();
    } catch (err) {
      console.error("Error toggling module:", err);
      setError(err instanceof Error ? err.message : "Failed to toggle module");
    }
  };

  const handleViewDetails = (module: Module) => {
    setSelectedModule(module);
    setDetailsOpen(true);
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Check authentication
  if (!isAuthenticated || !profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // Check system admin authorization
  if (!isSysAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to system administrators.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Typography variant="h4" gutterBottom>
        Module Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage system-wide module enablement, configuration, and feature flags.
        Changes affect all organizations and workspaces.
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Summary Cards */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h5">Total Modules</Typography>
                <Typography sx={{ fontSize: "2.125rem", fontWeight: 300 }}>
                  {modules.length}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h5">Enabled</Typography>
                <Typography sx={{ fontSize: "2.125rem", fontWeight: 300, color: "success.main" }}>
                  {modules.filter((m) => m.isEnabled).length}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h5">Core Modules</Typography>
                <Typography sx={{ fontSize: "2.125rem", fontWeight: 300 }}>
                  {modules.filter((m) => m.type === "core").length}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Modules Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Module</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Dependencies</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modules.map((module) => (
                  <TableRow key={module.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {module.displayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {module.name}
                        </Typography>
                        {module.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.5 }}
                          >
                            {module.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={module.type}
                        size="small"
                        color={module.type === "core" ? "primary" : "default"}
                      />
                      {module.tier && (
                        <Chip
                          label={`Tier ${module.tier}`}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {module.isEnabled ? (
                          <EnabledIcon color="success" fontSize="small" />
                        ) : (
                          <DisabledIcon color="error" fontSize="small" />
                        )}
                        <Switch
                          checked={module.isEnabled}
                          onChange={() => handleToggleEnabled(module)}
                          size="small"
                          inputProps={{
                            'aria-label': `Enable or disable ${module.displayName} at system level`,
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      {module.dependencies && module.dependencies.length > 0 ? (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {module.dependencies.map((dep) => (
                            <Chip key={dep} label={dep} size="small" />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          None
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(module)}
                          aria-label={`View details for ${module.displayName}`}
                        >
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Module Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedModule?.displayName} Details
        </DialogTitle>
        <DialogContent>
          {selectedModule && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Module Name
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {selectedModule.name}
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Description
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {selectedModule.description || "No description"}
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Version
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {selectedModule.version || "Not specified"}
              </Typography>

              {selectedModule.config && Object.keys(selectedModule.config).length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Configuration
                  </Typography>
                  <pre
                    style={{
                      background: "#f5f5f5",
                      padding: "12px",
                      borderRadius: "4px",
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(selectedModule.config, null, 2)}
                  </pre>
                </>
              )}

              {selectedModule.featureFlags &&
                Object.keys(selectedModule.featureFlags).length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Feature Flags
                    </Typography>
                    <pre
                      style={{
                        background: "#f5f5f5",
                        padding: "12px",
                        borderRadius: "4px",
                        overflow: "auto",
                      }}
                    >
                      {JSON.stringify(selectedModule.featureFlags, null, 2)}
                    </pre>
                  </>
                )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}