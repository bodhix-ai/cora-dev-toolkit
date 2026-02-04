/**
 * Organization Module Configuration Page
 *
 * Allows org admins to configure module enablement and settings
 * for their organization. Shows inherited settings from system level
 * and allows org-level overrides.
 *
 * ADR-019a Compliance: Frontend Admin Authorization
 * - Uses useRole() + useOrganizationContext()
 * - Implements loading state checks
 * - Validates org admin permissions
 */

"use client";

import React, { useState } from "react";
import { useRole, useOrganizationContext } from "@{{PROJECT_NAME}}/module-access";
import {
  Box,
  Container,
  Typography,
  Alert,
  CircularProgress,
  Switch,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Card,
  CardContent,
} from "@mui/material";
import {
  CheckCircle as EnabledIcon,
  Cancel as DisabledIcon,
  Lock as LockedIcon,
} from "@mui/icons-material";

import { useOrgModuleConfig, type OrgModuleConfig } from "../hooks/useOrgModuleConfig";

export default function OrgModuleConfigPage() {
  // ADR-019a: Frontend admin authorization
  const { isOrgAdmin } = useRole();
  const { currentOrganization, isLoading: orgLoading } = useOrganizationContext();

  // Fetch org module config
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

  // Local state for update errors
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // ADR-019a: Loading state checks (REQUIRED)
  if (orgLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // ADR-019a: Authorization check (REQUIRED)
  if (!isOrgAdmin) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          You do not have permission to access this page. Organization admin role required.
        </Alert>
      </Container>
    );
  }

  if (!currentOrganization) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Organization context not available. Please select an organization.
        </Alert>
      </Container>
    );
  }

  const handleToggleEnabled = async (module: OrgModuleConfig) => {
    try {
      setUpdateError(null);
      setUpdateSuccess(null);

      const newEnabledState = !module.orgEnabled;

      // Call the hook's updateConfig method
      const success = await updateConfig(module.name, {
        isEnabled: newEnabledState,
      });

      if (success) {
        setUpdateSuccess(
          `Module '${module.displayName}' ${newEnabledState ? "enabled" : "disabled"} successfully`
        );
        // Refresh modules list
        await refreshModules();
      } else {
        setUpdateError(`Failed to update module '${module.displayName}'`);
      }
    } catch (err) {
      console.error("Error toggling module:", err);
      setUpdateError(
        err instanceof Error ? err.message : "Failed to toggle module"
      );
    }
  };

  // Determine if toggle is disabled
  const isToggleDisabled = (module: OrgModuleConfig) => {
    // Can't enable if system disabled
    if (!module.systemEnabled) return true;
    return false;
  };

  // Get tooltip for disabled toggle
  const getDisabledReason = (module: OrgModuleConfig) => {
    if (!module.systemEnabled)
      return "Module is disabled at system level. Contact system administrator.";
    return "";
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Module Configuration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage which modules are enabled for your organization (
        {currentOrganization.orgName}). Changes affect all workspaces in your organization.
      </Typography>

      {/* Success Alert */}
      {updateSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setUpdateSuccess(null)}
        >
          {updateSuccess}
        </Alert>
      )}

      {/* Error Alerts */}
      {modulesError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {modulesError}
        </Alert>
      )}
      {updateError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setUpdateError(null)}
        >
          {updateError}
        </Alert>
      )}

      {/* Loading State */}
      {modulesLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Module</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="center">System</TableCell>
                    <TableCell align="center">Organization</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modules.map((module) => (
                    <TableRow key={module.id || module.name}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {module.displayName}
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
                            sx={{ ml: 0.5 }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {module.systemEnabled ? (
                          <EnabledIcon color="success" fontSize="small" />
                        ) : (
                          <DisabledIcon color="error" fontSize="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}
                        >
                          {module.orgEnabled ? (
                            <EnabledIcon color="success" fontSize="small" />
                          ) : (
                            <DisabledIcon color="error" fontSize="small" />
                          )}
                          <Switch
                            checked={module.orgEnabled || false}
                            onChange={() => handleToggleEnabled(module)}
                            size="small"
                            disabled={isToggleDisabled(module)}
                            inputProps={{
                              'aria-label': `Enable or disable ${module.displayName} for this organization`,
                            }}
                          />
                          {isToggleDisabled(module) && (
                            <Tooltip title={getDisabledReason(module)}>
                              <LockedIcon color="disabled" fontSize="small" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}