/**
 * @component OrgMgmtAdmin
 * @description Organization Management Admin Component - Module configuration management
 * 
 * @routes
 * - GET /admin/org/mgmt/modules - List organization module configurations
 * - PUT /admin/org/mgmt/modules/{name}/enable - Enable module for organization
 * - PUT /admin/org/mgmt/modules/{name}/disable - Disable module for organization
 * - GET /admin/org/mgmt/modules/{name}/config - Get module configuration
 * - PUT /admin/org/mgmt/modules/{name}/config - Update module configuration
 */

import React, { useState } from "react";
import { useUser, useRole, useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import { useOrgModuleConfig, type OrgModuleConfig } from "../../hooks";
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  Switch,
  Chip,
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
  Button,
  Breadcrumbs,
  Link,
} from "@mui/material";
import {
  Info as InfoIcon,
  CheckCircle as EnabledIcon,
  Cancel as DisabledIcon,
  Lock as LockedIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";

/**
 * Organization Module Configuration Component
 *
 * Main UI for managing module configuration at organization level.
 * Follows ADR-019 Layer 1 admin authorization pattern.
 */
export function OrgMgmtAdmin(): React.ReactElement {
  // ADR-019 Layer 1: Admin Authorization Pattern
  const { loading: userLoading, isAuthenticated, profile } = useUser();
  const { isOrgAdmin } = useRole();
  const { currentOrganization, isLoading: orgLoading } = useOrganizationContext();

  // Module data hook
  const {
    modules,
    isLoading: modulesLoading,
    error: modulesError,
    updateConfig,
    refreshModules,
  } = useOrgModuleConfig({
    orgId: currentOrganization?.orgId || null,
    autoFetch: !!currentOrganization?.orgId,
  });

  // Local state
  const [selectedModule, setSelectedModule] = useState<OrgModuleConfig | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Combined loading state (REQUIRED by ADR-019)
  const isLoading = userLoading || orgLoading || modulesLoading;

  const handleToggleEnabled = async (module: OrgModuleConfig): Promise<void> => {
    try {
      setUpdateError(null);

      // Call the hook's updateConfig method
      await updateConfig(module.name, {
        isEnabled: !module.isEnabled,
      });

      // Refresh modules list
      await refreshModules();

      // Reload page to update left navigation (ModuleGate components)
      // This ensures the Sidebar's org-level module checks refresh
      window.location.reload();
    } catch (err) {
      console.error("Error toggling module:", err);
      setUpdateError(
        err instanceof Error ? err.message : "Failed to toggle module"
      );
    }
  };

  const handleViewDetails = (module: OrgModuleConfig): void => {
    setSelectedModule(module);
    setDetailsOpen(true);
  };

  // ADR-019 Compliance: Loading state check (REQUIRED)
  if (isLoading) {
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

  // ADR-019a Compliance: Authentication check (REQUIRED)
  if (!isAuthenticated || !profile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You must be logged in to access this page.
        </Alert>
      </Box>
    );
  }

  // ADR-019 Compliance: Authorization check (REQUIRED)
  if (!isOrgAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to organization
          administrators.
        </Alert>
      </Box>
    );
  }

  // Check org context
  if (!currentOrganization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Organization context not available. Please select an organization.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 2 }}
      >
        <Link
          underline="hover"
          color="inherit"
          href="/admin/org"
          sx={{ display: 'flex', alignItems: 'center' }}
          aria-label="Navigate to Org Admin"
        >
          Org Admin
        </Link>
        <Typography color="text.primary">Management</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Typography variant="h4" gutterBottom>
        Module Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Organization: <strong>{currentOrganization.orgName}</strong>
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage module enablement for your organization. Changes affect all
        workspaces in this organization.
      </Typography>

      {/* Error Alerts */}
      {modulesError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setUpdateError(null)}
        >
          {modulesError}
        </Alert>
      )}
      {updateError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setUpdateError(null)}
        >
          {updateError}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h5">Total Modules</Typography>
            <Typography variant="body1" sx={{ fontSize: '2.5rem', fontWeight: 500 }}>{modules.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h5">Enabled</Typography>
            <Typography variant="body1" color="success.main" sx={{ fontSize: '2.5rem', fontWeight: 500 }}>
              {modules.filter((m: OrgModuleConfig) => m.isEnabled).length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h5">System Disabled</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '2.5rem', fontWeight: 500 }}>
              {modules.filter((m: OrgModuleConfig) => !m.systemEnabled).length}
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
              <TableCell>System Status</TableCell>
              <TableCell>Org Status</TableCell>
              <TableCell>Dependencies</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modules.map((module: OrgModuleConfig) => (
              <TableRow key={module.id || module.name}>
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
                    {module.systemEnabled ? (
                      <>
                        <EnabledIcon color="success" fontSize="small" />
                        <Typography variant="body2" color="success.main">
                          Enabled
                        </Typography>
                      </>
                    ) : (
                      <>
                        <LockedIcon color="disabled" fontSize="small" />
                        <Typography variant="body2" color="text.secondary">
                          Disabled
                        </Typography>
                      </>
                    )}
                  </Box>
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
                      disabled={!module.systemEnabled} // Can't enable if system disabled
                      aria-label={`Toggle ${module.displayName} module`}
                    />
                    {!module.systemEnabled && (
                      <Tooltip title="Module is disabled at system level">
                        <LockedIcon color="disabled" fontSize="small" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {module.dependencies && module.dependencies.length > 0 ? (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {module.dependencies.map((dep: string) => (
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
                      aria-label="View module details"
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

      {/* Module Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedModule?.displayName} Details</DialogTitle>
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

              <Typography variant="subtitle2" gutterBottom>
                Enablement Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  System Level:{" "}
                  {selectedModule.systemEnabled ? (
                    <Chip label="Enabled" size="small" color="success" />
                  ) : (
                    <Chip label="Disabled" size="small" color="error" />
                  )}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Organization Level:{" "}
                  {selectedModule.isEnabled ? (
                    <Chip label="Enabled" size="small" color="success" />
                  ) : (
                    <Chip label="Disabled" size="small" color="error" />
                  )}
                </Typography>
              </Box>

              {selectedModule.config &&
                Object.keys(selectedModule.config).length > 0 && (
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

export default OrgMgmtAdmin;